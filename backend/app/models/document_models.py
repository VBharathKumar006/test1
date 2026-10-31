"""SQLAlchemy ORM models for document management."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Document(Base):
    """Represents an uploaded enterprise document."""
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    document_title = Column(String, nullable=True)
    file_type = Column(String, nullable=False)  # pdf, html, md, txt
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String, nullable=True, unique=True)  # MD5 for dedup

    # Enterprise metadata
    department = Column(String, nullable=True)
    team = Column(String, nullable=True)
    document_category = Column(String, nullable=True)
    document_version = Column(String, nullable=True)
    effective_date = Column(String, nullable=True)
    expiration_date = Column(String, nullable=True)
    access_scope = Column(String, default="internal")  # public, internal, restricted
    document_status = Column(String, default="active")  # active, superseded, draft

    # Processing state
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String, default="pending")  # pending, processing, indexed, failed
    processing_error = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    indexed_at = Column(DateTime, nullable=True)

    # Source info
    source_location = Column(String, nullable=True)

    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Represents a chunk of text from a document."""
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)

    # Content
    original_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=True)

    # Structure metadata
    section_title = Column(String, nullable=True)
    parent_heading = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    source_type = Column(String, nullable=True)

    # Inherited from document
    document_title = Column(String, nullable=True)
    source_filename = Column(String, nullable=True)
    department = Column(String, nullable=True)
    team = Column(String, nullable=True)
    document_version = Column(String, nullable=True)
    effective_date = Column(String, nullable=True)

    # Embedding
    embedding_model = Column(String, nullable=True)
    faiss_index_id = Column(Integer, nullable=True)  # position in FAISS index

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class ProcessingJob(Base):
    """Tracks background document processing jobs."""
    __tablename__ = "processing_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    job_type = Column(String, default="ingest")  # ingest, reindex
    status = Column(String, default="queued")   # queued, running, complete, failed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    progress_pct = Column(Float, default=0.0)

    document = relationship("Document", back_populates="processing_jobs")


class ConflictRecord(Base):
    """Stores detected conflicts between document passages."""
    __tablename__ = "conflict_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    conflict_type = Column(String, nullable=False)  # direct, version, date, team, department, scope, unresolved
    topic = Column(String, nullable=True)

    # Document references
    doc_id_a = Column(String, ForeignKey("documents.id"), nullable=False)
    doc_id_b = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_id_a = Column(String, nullable=True)
    chunk_id_b = Column(String, nullable=True)

    # Conflicting content
    statement_a = Column(Text, nullable=True)
    statement_b = Column(Text, nullable=True)
    resolution_status = Column(String, default="unresolved")  # unresolved, resolved, clarified
    resolution_note = Column(Text, nullable=True)

    detected_at = Column(DateTime, default=datetime.utcnow)
    severity = Column(String, default="medium")  # low, medium, high


class QueryLog(Base):
    """Logs all queries for analytics and evaluation."""
    __tablename__ = "query_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String, nullable=True)  # answered, insufficient_evidence, conflicting, clarification_needed
    chunk_ids_retrieved = Column(JSON, nullable=True)
    document_ids_retrieved = Column(JSON, nullable=True)
    latency_ms = Column(Float, nullable=True)
    session_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    feedback = Column(String, nullable=True)  # positive, negative

