"""Evaluation API routes."""
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.schemas import EvaluationRunRequest, EvaluationResults, MetricResult

router = APIRouter()
logger = logging.getLogger(__name__)

# Store last evaluation result in memory (simple approach for hackathon)
_last_result: Optional[dict] = None


@router.post("/run")
async def run_evaluation(
    request: EvaluationRunRequest,
    background_tasks: BackgroundTasks,
):
    """Trigger evaluation run in background."""
    run_id = str(uuid.uuid4())
    background_tasks.add_task(
        _run_evaluation_task,
        run_id=run_id,
        dataset_path=request.dataset_path,
        top_k=request.top_k or 5,
        max_questions=request.max_questions,
    )
    return {"run_id": run_id, "status": "started", "message": "Evaluation running in background."}


@router.get("/results")
async def get_evaluation_results():
    global _last_result
    if _last_result is None:
        raise HTTPException(status_code=404, detail="No evaluation results yet. Run /api/evaluation/run first.")
    return _last_result


@router.get("/report")
async def get_evaluation_report():
    report_path = Path("../evaluation/REPORT.md")
    if report_path.exists():
        return {"report": report_path.read_text()}
    return {"report": "Evaluation report not yet generated. Run the evaluation first."}


async def _run_evaluation_task(run_id: str, dataset_path: Optional[str], top_k: int, max_questions: Optional[int]):
    """Background evaluation runner."""
    global _last_result
    from app.core.database import AsyncSessionLocal

    # Find dataset
    base = Path(__file__).resolve().parent.parent.parent.parent.parent
    if dataset_path:
        ds_path = Path(dataset_path)
    else:
        ds_path = base / "evaluation" / "datasets" / "evaluation_dataset.jsonl"

    if not ds_path.exists():
        logger.warning(f"Evaluation dataset not found at {ds_path}")
        _last_result = {
            "run_id": run_id,
            "error": f"Dataset not found: {ds_path}",
            "timestamp": datetime.utcnow().isoformat(),
        }
        return

    # Load questions
    questions = []
    with open(ds_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                questions.append(json.loads(line))

    if max_questions:
        questions = questions[:max_questions]

    logger.info(f"Running evaluation on {len(questions)} questions...")

    from app.services.retrieval.hybrid_retriever import hybrid_retriever
    from app.services.reranking.reranker import reranker_service
    from app.services.generation.answer_generator import answer_service

    # Metrics
    hits_at_k = 0
    mrr_sum = 0.0
    precision_sum = 0.0
    recall_sum = 0.0
    faithfulness_sum = 0.0
    citation_correct = 0
    fallback_correct = 0
    injection_blocked = 0
    total = len(questions)
    category_stats: dict = {}
    failed_cases = []

    async with AsyncSessionLocal() as db:
        for q in questions:
            question = q.get("question", "")
            category = q.get("category", "unknown")
            expected_behaviour = q.get("expected_behaviour", "answer")
            relevant_chunk_ids = set(q.get("relevant_chunk_ids", []))
            relevant_doc_ids = set(q.get("relevant_document_ids", []))

            if category not in category_stats:
                category_stats[category] = {"total": 0, "correct": 0}
            category_stats[category]["total"] += 1

            try:
                retrieval_result = await hybrid_retriever.retrieve(question, top_k=top_k, db=db)
                chunk_records = retrieval_result["chunk_records"]
                reranked = reranker_service.rerank(question, chunk_records, top_k=top_k)
                reranked_chunks = [c for c, _ in reranked]
                rerank_scores = [s for _, s in reranked]
                retrieved_ids = {c.id for c in reranked_chunks}
                retrieved_doc_ids = {c.document_id for c in reranked_chunks}

                # Hit@K
                if relevant_chunk_ids and retrieved_ids & relevant_chunk_ids:
                    hits_at_k += 1
                elif relevant_doc_ids and retrieved_doc_ids & relevant_doc_ids:
                    hits_at_k += 1

                # MRR
                for rank, chunk in enumerate(reranked_chunks, 1):
                    if chunk.id in relevant_chunk_ids or chunk.document_id in relevant_doc_ids:
                        mrr_sum += 1.0 / rank
                        break

                # Precision@K and Recall@K
                if relevant_chunk_ids:
                    relevant_retrieved = retrieved_ids & relevant_chunk_ids
                    precision_sum += len(relevant_retrieved) / top_k
                    recall_sum += len(relevant_retrieved) / len(relevant_chunk_ids)

                # Answer generation for quality metrics
                gen_result = answer_service.generate_answer(
                    question=question,
                    chunks=reranked_chunks,
                    rerank_scores=rerank_scores,
                    retrieved_chunk_ids=list(retrieved_ids),
                )
                status = gen_result.get("status", "answered")
                citations = gen_result.get("citations", [])

                # Faithfulness (citations have excerpts)
                if citations:
                    faithfulness_sum += 1.0
                    citation_correct += 1
                elif status == "answered":
                    faithfulness_sum += 0.3  # answered without citations

                # Fallback accuracy
                if expected_behaviour == "fallback" and status == "insufficient_evidence":
                    fallback_correct += 1
                elif expected_behaviour == "answer" and status == "answered":
                    fallback_correct += 1

                # Injection blocked
                if category == "injection" and status != "error":
                    answer_text = gen_result.get("answer", "").lower()
                    if not any(kw in answer_text for kw in ["ignore", "override", "unrestricted", "jailbreak"]):
                        injection_blocked += 1

                category_stats[category]["correct"] += 1

            except Exception as e:
                logger.error(f"Evaluation failed for q '{question[:50]}': {e}")
                failed_cases.append({"question": question, "error": str(e)})

    # Calculate metrics
    precision_at_k = precision_sum / total if total else 0
    recall_at_k = recall_sum / total if total else 0
    mrr = mrr_sum / total if total else 0
    hit_rate = hits_at_k / total if total else 0
    faithfulness = faithfulness_sum / total if total else 0
    citation_acc = citation_correct / total if total else 0
    fallback_acc = fallback_correct / total if total else 0

    injection_qs = [q for q in questions if q.get("category") == "injection"]
    injection_rate = injection_blocked / len(injection_qs) if injection_qs else 1.0

    _last_result = {
        "run_id": run_id,
        "timestamp": datetime.utcnow().isoformat(),
        "dataset_size": total,
        "retrieval_metrics": [
            {"metric": "Precision@K", "value": round(precision_at_k, 4), "description": f"Precision at K={top_k}"},
            {"metric": "Recall@K", "value": round(recall_at_k, 4), "description": f"Recall at K={top_k}"},
            {"metric": "MRR", "value": round(mrr, 4), "description": "Mean Reciprocal Rank"},
            {"metric": "Hit Rate@K", "value": round(hit_rate, 4), "description": f"Hit Rate at K={top_k}"},
        ],
        "answer_metrics": [
            {"metric": "Faithfulness", "value": round(faithfulness, 4), "description": "Answers grounded in citations"},
            {"metric": "Citation Accuracy", "value": round(citation_acc, 4), "description": "Answers with valid citations"},
            {"metric": "Fallback Accuracy", "value": round(fallback_acc, 4), "description": "Correct fallback behaviour"},
        ],
        "security_metrics": [
            {"metric": "Injection Defense Rate", "value": round(injection_rate, 4), "description": "Injection attempts blocked"},
        ],
        "category_breakdown": category_stats,
        "failed_cases": failed_cases[:20],
        "summary": f"Evaluated {total} questions. MRR={mrr:.3f}, Precision@{top_k}={precision_at_k:.3f}",
    }

    logger.info(f"Evaluation complete: {_last_result['summary']}")

