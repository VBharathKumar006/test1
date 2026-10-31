"""System, health, and stats endpoints."""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.config import settings
from app.models.document_models import Document, DocumentChunk, QueryLog, ConflictRecord
from app.schemas.schemas import SystemStats, HealthResponse, SettingsOut, SettingsUpdate, DocumentOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthResponse)
async def health_check():
    from app.services.embeddings.embedding_service import embedding_service
    return HealthResponse(
        status="ok",
        version="1.0.0",
        embedding_model=settings.EMBEDDING_MODEL,
        llm_provider=settings.LLM_PROVIDER,
        llm_model=settings.LLM_MODEL,
        vector_store=f"FAISS ({embedding_service.total_vectors} vectors)",
        database="SQLite",
    )


@router.get("/stats", response_model=SystemStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar()
    indexed_docs = (await db.execute(
        select(func.count(Document.id)).where(Document.processing_status == "indexed")
    )).scalar()
    failed_docs = (await db.execute(
        select(func.count(Document.id)).where(Document.processing_status == "failed")
    )).scalar()
    total_chunks = (await db.execute(select(func.count(DocumentChunk.id)))).scalar()
    total_queries = (await db.execute(select(func.count(QueryLog.id)))).scalar()
    total_conflicts = (await db.execute(select(func.count(ConflictRecord.id)))).scalar()

    avg_latency_row = await db.execute(select(func.avg(QueryLog.latency_ms)))
    avg_latency = avg_latency_row.scalar()

    recent_uploads_result = await db.execute(
        select(Document).order_by(Document.upload_timestamp.desc()).limit(5)
    )
    recent_uploads = recent_uploads_result.scalars().all()

    return SystemStats(
        total_documents=total_docs or 0,
        indexed_documents=indexed_docs or 0,
        failed_documents=failed_docs or 0,
        total_chunks=total_chunks or 0,
        total_queries=total_queries or 0,
        detected_conflicts=total_conflicts or 0,
        supported_formats=["pdf", "html", "md", "txt"],
        avg_retrieval_latency_ms=round(avg_latency, 1) if avg_latency else None,
        recent_uploads=list(recent_uploads),
    )


@router.get("/settings", response_model=SettingsOut)
async def get_settings():
    return SettingsOut(
        llm_provider=settings.LLM_PROVIDER,
        llm_model=settings.LLM_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
        max_chunk_size=settings.MAX_CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        retrieval_top_k=settings.RETRIEVAL_TOP_K,
        rerank_top_k=settings.RERANK_TOP_K,
        semantic_weight=settings.SEMANTIC_WEIGHT,
        bm25_weight=settings.BM25_WEIGHT,
        confidence_threshold=settings.CONFIDENCE_THRESHOLD,
        low_confidence_threshold=settings.LOW_CONFIDENCE_THRESHOLD,
    )


@router.patch("/settings", response_model=SettingsOut)
async def update_settings(update: SettingsUpdate):
    """Update runtime settings (non-persistent — restart to apply persisted changes)."""
    if update.retrieval_top_k is not None:
        settings.RETRIEVAL_TOP_K = update.retrieval_top_k
    if update.rerank_top_k is not None:
        settings.RERANK_TOP_K = update.rerank_top_k
    if update.semantic_weight is not None:
        settings.SEMANTIC_WEIGHT = update.semantic_weight
    if update.bm25_weight is not None:
        settings.BM25_WEIGHT = update.bm25_weight
    if update.confidence_threshold is not None:
        settings.CONFIDENCE_THRESHOLD = update.confidence_threshold
    if update.low_confidence_threshold is not None:
        settings.LOW_CONFIDENCE_THRESHOLD = update.low_confidence_threshold
    return await get_settings()

