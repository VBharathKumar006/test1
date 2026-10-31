"""
Chat / Query API routes.
POST /api/chat/query
GET  /api/chat/history
POST /api/chat/feedback
"""
import logging
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.document_models import QueryLog
from app.schemas.schemas import (
    QueryRequest, QueryResponse, FeedbackRequest, Citation,
    ConflictItem, RetrievalMetadata, ChatHistoryItem
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """Process a natural language question against indexed documents."""
    start_time = time.time()

    from app.services.retrieval.hybrid_retriever import hybrid_retriever
    from app.services.reranking.reranker import reranker_service
    from app.services.generation.answer_generator import answer_service
    from app.services.conflicts.conflict_detector import conflict_detector
    from app.services.confidence.confidence_service import confidence_scorer

    question = request.question.strip()
    session_id = request.session_id or str(uuid.uuid4())
    top_k = request.top_k or settings.RETRIEVAL_TOP_K

    # ── Step 1: Hybrid Retrieval ──────────────────────────────────────────────
    retrieval_start = time.time()
    retrieval_result = await hybrid_retriever.retrieve(
        query=question,
        top_k=top_k,
        filters=request.filters,
        db=db,
    )
    retrieval_ms = (time.time() - retrieval_start) * 1000

    chunk_records = retrieval_result["chunk_records"]

    if not chunk_records:
        # No relevant chunks found
        response = _build_no_evidence_response(question, session_id, start_time)
        await _log_query(db, response, question, session_id, [])
        return response

    # ── Step 2: Reranking ─────────────────────────────────────────────────────
    reranked = reranker_service.rerank(
        query=question,
        chunks=chunk_records,
        top_k=settings.RERANK_TOP_K,
    )
    reranked_chunks = [chunk for chunk, score in reranked]
    rerank_scores = [score for chunk, score in reranked]
    retrieved_chunk_ids = [c.id for c in reranked_chunks]

    # ── Step 3: Conflict Detection ────────────────────────────────────────────
    detected_conflicts = conflict_detector.detect_conflicts(reranked_chunks)

    # ── Step 4: Answer Generation ─────────────────────────────────────────────
    gen_result = answer_service.generate_answer(
        question=question,
        chunks=reranked_chunks,
        rerank_scores=rerank_scores,
        retrieved_chunk_ids=retrieved_chunk_ids,
    )

    # ── Step 5: Confidence Scoring ────────────────────────────────────────────
    llm_confidence = float(gen_result.get("confidence", 0.5))
    status = gen_result.get("status", "answered")
    num_citations = len(gen_result.get("citations", []))
    num_conflicts = len(detected_conflicts)

    confidence = confidence_scorer.compute(
        rerank_scores=rerank_scores,
        llm_confidence=llm_confidence,
        num_citations=num_citations,
        num_conflicts=num_conflicts,
        status=status,
    )

    # ── Step 6: Build Response ────────────────────────────────────────────────
    total_ms = (time.time() - start_time) * 1000

    # Map citations to schema
    citations = []
    for cit in gen_result.get("citations", []):
        try:
            citations.append(Citation(
                citation_id=cit.get("citation_id", "1"),
                chunk_id=cit.get("chunk_id", ""),
                document_id=cit.get("document_id", ""),
                source_document=cit.get("source_document", ""),
                document_title=cit.get("document_title"),
                section_title=cit.get("section_title"),
                page_number=cit.get("page_number"),
                document_version=cit.get("document_version"),
                effective_date=cit.get("effective_date"),
                department=cit.get("department"),
                team=cit.get("team"),
                excerpt=cit.get("excerpt", ""),
                relevance_score=float(cit.get("relevance_score", 0.0)),
            ))
        except Exception as e:
            logger.warning(f"Skipping malformed citation: {e}")

    # Map conflicts from LLM response + detector
    all_conflicts_raw = gen_result.get("conflicts_detected", []) + detected_conflicts
    conflicts = []
    seen_conflict_ids = set()
    for conf in all_conflicts_raw:
        cid = conf.get("conflict_id", str(uuid.uuid4()))
        if cid in seen_conflict_ids:
            continue
        seen_conflict_ids.add(cid)
        try:
            conflicts.append(ConflictItem(
                conflict_id=cid,
                conflict_type=conf.get("conflict_type", "direct"),
                topic=conf.get("topic"),
                document_a=conf.get("document_a", conf.get("source_a", "")),
                document_b=conf.get("document_b", conf.get("source_b", "")),
                version_a=conf.get("version_a"),
                version_b=conf.get("version_b"),
                effective_date_a=conf.get("effective_date_a"),
                effective_date_b=conf.get("effective_date_b"),
                department_a=conf.get("department_a"),
                department_b=conf.get("department_b"),
                team_a=conf.get("team_a"),
                team_b=conf.get("team_b"),
                statement_a=conf.get("statement_a", conf.get("statement_a", "")),
                statement_b=conf.get("statement_b", conf.get("statement_b", "")),
                severity=conf.get("severity", "medium"),
                resolution_status=conf.get("resolution_status", "unresolved"),
                explanation=conf.get("explanation"),
            ))
        except Exception as e:
            logger.warning(f"Skipping malformed conflict: {e}")

    # Build retrieval metadata
    score_map = retrieval_result.get("score_map", {})
    ret_meta = RetrievalMetadata(
        chunk_ids=retrieved_chunk_ids,
        semantic_scores=[score_map.get(cid, (0, 0, 0))[1] for cid in retrieved_chunk_ids],
        bm25_scores=[score_map.get(cid, (0, 0, 0))[2] for cid in retrieved_chunk_ids],
        rerank_scores=rerank_scores,
        final_scores=[score_map.get(cid, (0, 0, 0))[0] for cid in retrieved_chunk_ids],
        filters_applied=request.filters,
        retrieval_latency_ms=retrieval_ms,
    )

    query_id = gen_result.get("query_id", str(uuid.uuid4()))
    clarification_question = gen_result.get("clarification_question")
    clarification_required = bool(clarification_question) or status == "clarification_needed"

    response = QueryResponse(
        question=question,
        answer=gen_result.get("answer", ""),
        status=status,
        confidence=confidence,
        citations=citations,
        supporting_passages=gen_result.get("supporting_passages", []),
        conflicts=conflicts,
        clarification_required=clarification_required,
        clarification_question=clarification_question,
        retrieval_metadata=ret_meta,
        session_id=session_id,
        query_id=query_id,
        latency_ms=total_ms,
    )

    # Log query
    await _log_query(db, response, question, session_id, retrieved_chunk_ids)

    return response


def _build_no_evidence_response(question: str, session_id: str, start_time: float) -> QueryResponse:
    return QueryResponse(
        question=question,
        answer=(
            "I could not find any relevant information in the indexed documents. "
            "Please ensure the relevant documents have been uploaded and processed, "
            "or rephrase your question."
        ),
        status="insufficient_evidence",
        confidence=0.0,
        citations=[],
        supporting_passages=[],
        conflicts=[],
        clarification_required=False,
        clarification_question=None,
        retrieval_metadata=None,
        session_id=session_id,
        query_id=str(uuid.uuid4()),
        latency_ms=(time.time() - start_time) * 1000,
    )


async def _log_query(db: AsyncSession, response: QueryResponse, question: str, session_id: str, chunk_ids: list):
    try:
        log = QueryLog(
            id=response.query_id,
            question=question,
            answer=response.answer[:2000],
            confidence=response.confidence,
            status=response.status,
            chunk_ids_retrieved=chunk_ids,
            document_ids_retrieved=list({c.document_id for c in [] }),
            latency_ms=response.latency_ms,
            session_id=session_id,
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to log query: {e}")


@router.get("/history")
async def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(QueryLog).order_by(QueryLog.timestamp.desc()).limit(limit)
    if session_id:
        query = query.where(QueryLog.session_id == session_id)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        ChatHistoryItem(
            query_id=log.id,
            question=log.question,
            answer=log.answer or "",
            status=log.status or "unknown",
            confidence=log.confidence or 0.0,
            timestamp=log.timestamp,
            session_id=log.session_id,
        )
        for log in logs
    ]


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    log = await db.get(QueryLog, request.query_id)
    if not log:
        raise HTTPException(status_code=404, detail="Query not found.")
    log.feedback = request.feedback
    await db.commit()
    return {"message": "Feedback recorded."}

