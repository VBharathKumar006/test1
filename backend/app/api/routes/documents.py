"""
Document management API routes.
POST /api/documents/upload
GET  /api/documents
GET  /api/documents/{id}
DELETE /api/documents/{id}
POST /api/documents/{id}/reindex
GET  /api/documents/{id}/chunks
"""
import logging
import os
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.config import settings
from app.models.document_models import Document, DocumentChunk, ProcessingJob
from app.schemas.schemas import DocumentOut, ChunkOut, DocumentListResponse
from app.services.security.security_service import validate_file, compute_file_hash, safe_filename

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Background ingestion task ────────────────────────────────────────────────

async def process_document_task(document_id: str, file_path: str, filename: str):
    """Background task: parse, chunk, embed and index a document."""
    from app.core.database import AsyncSessionLocal
    from app.services.ingestion.document_parser import ingestion_service
    from app.services.preprocessing.content_cleaner import content_cleaner
    from app.services.chunking.chunker import StructureAwareChunker
    from app.services.embeddings.embedding_service import embedding_service
    from app.services.retrieval.hybrid_retriever import hybrid_retriever

    async with AsyncSessionLocal() as db:
        # Update status → processing
        doc = await db.get(Document, document_id)
        if not doc:
            return
        doc.processing_status = "processing"
        await db.commit()

        try:
            # Read file
            with open(file_path, "rb") as f:
                content = f.read()

            # Parse
            parsed = ingestion_service.parse_document(content, filename)

            # Extract enterprise metadata
            meta = ingestion_service.extract_enterprise_metadata(parsed, filename)

            # Update document with extracted metadata
            doc.document_title = meta.get("document_title") or doc.document_title
            if meta.get("department") and not doc.department:
                doc.department = meta["department"]
            if meta.get("document_version") and not doc.document_version:
                doc.document_version = meta["document_version"]
            if meta.get("effective_date") and not doc.effective_date:
                doc.effective_date = meta["effective_date"]
            if meta.get("document_category") and not doc.document_category:
                doc.document_category = meta["document_category"]

            # Clean sections
            cleaned_sections = [
                content_cleaner.clean_section(s, parsed.file_type)
                for s in parsed.sections
            ]
            # Filter empty sections
            cleaned_sections = [s for s in cleaned_sections if s.get("text", "").strip()]

            # Chunk
            chunker = StructureAwareChunker(
                chunk_size=settings.MAX_CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
            doc_meta = {
                "document_title": doc.document_title,
                "filename": filename,
                "department": doc.department,
                "team": doc.team,
                "document_version": doc.document_version,
                "effective_date": doc.effective_date,
            }
            chunks = chunker.chunk_document(
                document_id=document_id,
                sections=cleaned_sections,
                doc_metadata=doc_meta,
                file_type=parsed.file_type,
            )

            # If no sections parsed, create single chunk from raw text
            if not chunks and parsed.raw_text.strip():
                from app.services.chunking.chunker import DocumentChunkData
                chunks = [DocumentChunkData(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    chunk_index=0,
                    original_text=parsed.raw_text[:3000],
                    cleaned_text=parsed.raw_text[:3000],
                    section_title=None,
                    parent_heading=None,
                    page_number=None,
                    source_type=parsed.file_type,
                    document_title=doc.document_title,
                    source_filename=filename,
                    department=doc.department,
                    team=doc.team,
                    document_version=doc.document_version,
                    effective_date=doc.effective_date,
                )]

            # Save chunks to DB
            db_chunks = []
            for chunk_data in chunks:
                db_chunk = DocumentChunk(
                    id=chunk_data.chunk_id,
                    document_id=document_id,
                    chunk_index=chunk_data.chunk_index,
                    original_text=chunk_data.original_text,
                    cleaned_text=chunk_data.cleaned_text,
                    section_title=chunk_data.section_title,
                    parent_heading=chunk_data.parent_heading,
                    page_number=chunk_data.page_number,
                    source_type=chunk_data.source_type,
                    document_title=chunk_data.document_title,
                    source_filename=chunk_data.source_filename,
                    department=chunk_data.department,
                    team=chunk_data.team,
                    document_version=chunk_data.document_version,
                    effective_date=chunk_data.effective_date,
                    embedding_model=settings.EMBEDDING_MODEL,
                )
                db.add(db_chunk)
                db_chunks.append(db_chunk)

            await db.flush()

            # Embed and index
            chunk_ids = [c.chunk_id for c in chunks]
            chunk_texts = [c.original_text for c in chunks]

            faiss_positions = embedding_service.add_chunks(chunk_ids, chunk_texts)

            # Update FAISS index positions in DB
            for chunk_data, pos in zip(chunks, faiss_positions):
                for db_chunk in db_chunks:
                    if db_chunk.id == chunk_data.chunk_id:
                        db_chunk.faiss_index_id = pos
                        break

            # Add to BM25 index
            hybrid_retriever.bm25_index.add_chunks(chunk_ids, chunk_texts)

            # Update document status
            doc.processing_status = "indexed"
            doc.chunk_count = len(chunks)
            doc.indexed_at = datetime.utcnow()

            # Flag injection if detected
            if parsed.injection_detected:
                logger.warning(f"Document {document_id}: injection patterns detected and flagged.")

            await db.commit()
            logger.info(f"Document {document_id} indexed: {len(chunks)} chunks.")

        except Exception as e:
            logger.error(f"Document {document_id} processing failed: {e}", exc_info=True)
            doc = await db.get(Document, document_id)
            if doc:
                doc.processing_status = "failed"
                doc.processing_error = str(e)
                await db.commit()


# ─── Upload endpoint ──────────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentOut, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    department: Optional[str] = Form(None),
    team: Optional[str] = Form(None),
    document_version: Optional[str] = Form(None),
    effective_date: Optional[str] = Form(None),
    access_scope: Optional[str] = Form("internal"),
    db: AsyncSession = Depends(get_db),
):
    """Upload and begin processing a document."""
    content = await file.read()
    filename = safe_filename(file.filename or "document")

    # Validate
    is_valid, error_msg = validate_file(filename, content)
    if not is_valid:
        raise HTTPException(status_code=422, detail=error_msg)

    # Duplicate detection
    file_hash = compute_file_hash(content)
    existing = await db.execute(
        select(Document).where(Document.file_hash == file_hash)
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        raise HTTPException(
            status_code=409,
            detail=f"This document is already indexed as '{existing_doc.filename}' (ID: {existing_doc.id})."
        )

    # Detect format
    from pathlib import Path
    suffix = Path(filename).suffix.lower().lstrip(".")

    # Save file
    document_id = str(uuid.uuid4())
    upload_path = os.path.join(settings.UPLOAD_DIR, f"{document_id}_{filename}")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(upload_path, "wb") as f:
        f.write(content)

    # Create document record
    doc = Document(
        id=document_id,
        filename=filename,
        document_title=Path(filename).stem.replace("_", " ").replace("-", " ").title(),
        file_type=suffix,
        file_size=len(content),
        file_hash=file_hash,
        department=department,
        team=team,
        document_version=document_version,
        effective_date=effective_date,
        access_scope=access_scope or "internal",
        processing_status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Queue background processing
    background_tasks.add_task(process_document_task, document_id, upload_path, filename)

    logger.info(f"Document uploaded: {filename} (ID: {document_id})")
    return doc


# ─── List documents ───────────────────────────────────────────────────────────

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    department: Optional[str] = None,
    status: Optional[str] = None,
    file_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Document)
    if department:
        query = query.where(Document.department == department)
    if status:
        query = query.where(Document.processing_status == status)
    if file_type:
        query = query.where(Document.file_type == file_type)
    query = query.order_by(Document.upload_timestamp.desc())

    result = await db.execute(query)
    docs = result.scalars().all()

    count_result = await db.execute(select(func.count(Document.id)))
    total = count_result.scalar()

    return DocumentListResponse(documents=list(docs), total=total)


# ─── Get single document ──────────────────────────────────────────────────────

@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


# ─── Delete document ──────────────────────────────────────────────────────────

@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Get chunk IDs before deletion for index cleanup
    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == document_id)
    )
    chunks = chunks_result.scalars().all()
    chunk_ids = [c.id for c in chunks]

    # Remove from vector indexes
    from app.services.embeddings.embedding_service import embedding_service
    from app.services.retrieval.hybrid_retriever import hybrid_retriever
    if chunk_ids:
        embedding_service.remove_chunks(chunk_ids)
        hybrid_retriever.bm25_index.remove_chunks(chunk_ids)

    # Delete uploaded file
    upload_pattern = os.path.join(settings.UPLOAD_DIR, f"{document_id}_*")
    import glob
    for fpath in glob.glob(upload_pattern):
        try:
            os.remove(fpath)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
    logger.info(f"Document {document_id} deleted.")


# ─── Re-index document ────────────────────────────────────────────────────────

@router.post("/{document_id}/reindex", response_model=DocumentOut)
async def reindex_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove existing chunks from indexes
    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == document_id)
    )
    chunks = chunks_result.scalars().all()
    chunk_ids = [c.id for c in chunks]

    from app.services.embeddings.embedding_service import embedding_service
    from app.services.retrieval.hybrid_retriever import hybrid_retriever
    if chunk_ids:
        embedding_service.remove_chunks(chunk_ids)
        hybrid_retriever.bm25_index.remove_chunks(chunk_ids)

    # Delete DB chunks
    for chunk in chunks:
        await db.delete(chunk)

    # Reset document status
    doc.processing_status = "pending"
    doc.chunk_count = 0
    doc.indexed_at = None
    doc.processing_error = None
    await db.commit()

    # Find file
    import glob
    pattern = os.path.join(settings.UPLOAD_DIR, f"{document_id}_*")
    files = glob.glob(pattern)
    if not files:
        raise HTTPException(status_code=404, detail="Uploaded file not found for re-indexing.")

    file_path = files[0]
    filename = os.path.basename(file_path).split("_", 1)[-1]

    background_tasks.add_task(process_document_task, document_id, file_path, filename)
    await db.refresh(doc)
    return doc


# ─── Get document chunks ──────────────────────────────────────────────────────

@router.get("/{document_id}/chunks", response_model=List[ChunkOut])
async def get_document_chunks(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = result.scalars().all()
    return list(chunks)

