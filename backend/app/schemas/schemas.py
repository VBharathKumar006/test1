"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ─── Document Schemas ────────────────────────────────────────────────────────

class DocumentMetadataUpdate(BaseModel):
    department: Optional[str] = None
    team: Optional[str] = None
    document_category: Optional[str] = None
    document_version: Optional[str] = None
    effective_date: Optional[str] = None
    access_scope: Optional[str] = None
    document_status: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    filename: str
    document_title: Optional[str]
    file_type: str
    file_size: Optional[int]
    department: Optional[str]
    team: Optional[str]
    document_category: Optional[str]
    document_version: Optional[str]
    effective_date: Optional[str]
    access_scope: Optional[str]
    document_status: Optional[str]
    upload_timestamp: Optional[datetime]
    processing_status: str
    processing_error: Optional[str]
    chunk_count: int
    indexed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    original_text: str
    section_title: Optional[str]
    parent_heading: Optional[str]
    page_number: Optional[int]
    document_title: Optional[str]
    source_filename: Optional[str]
    department: Optional[str]
    team: Optional[str]
    document_version: Optional[str]
    effective_date: Optional[str]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentOut]
    total: int


# ─── Citation Schemas ─────────────────────────────────────────────────────────

class Citation(BaseModel):
    citation_id: str
    chunk_id: str
    document_id: str
    source_document: str
    document_title: Optional[str]
    section_title: Optional[str]
    page_number: Optional[int]
    document_version: Optional[str]
    effective_date: Optional[str]
    department: Optional[str]
    team: Optional[str]
    excerpt: str
    relevance_score: float


# ─── Conflict Schemas ─────────────────────────────────────────────────────────

class ConflictItem(BaseModel):
    conflict_id: str
    conflict_type: str
    topic: Optional[str]
    document_a: str
    document_b: str
    version_a: Optional[str]
    version_b: Optional[str]
    effective_date_a: Optional[str]
    effective_date_b: Optional[str]
    department_a: Optional[str]
    department_b: Optional[str]
    team_a: Optional[str]
    team_b: Optional[str]
    statement_a: str
    statement_b: str
    severity: str
    resolution_status: str
    explanation: Optional[str]


# ─── Chat / Query Schemas ─────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None  # department, team, version, etc.
    top_k: Optional[int] = None


class RetrievalMetadata(BaseModel):
    chunk_ids: List[str]
    semantic_scores: List[float]
    bm25_scores: List[float]
    rerank_scores: List[float]
    final_scores: List[float]
    filters_applied: Optional[Dict[str, Any]]
    retrieval_latency_ms: float


class QueryResponse(BaseModel):
    question: str
    answer: str
    status: str  # answered | insufficient_evidence | conflicting | clarification_needed | error
    confidence: float
    citations: List[Citation]
    supporting_passages: List[str]
    conflicts: List[ConflictItem]
    clarification_required: bool
    clarification_question: Optional[str]
    retrieval_metadata: Optional[RetrievalMetadata]
    session_id: Optional[str]
    query_id: str
    latency_ms: float


class FeedbackRequest(BaseModel):
    query_id: str
    feedback: str  # positive | negative
    comment: Optional[str] = None


class ChatHistoryItem(BaseModel):
    query_id: str
    question: str
    answer: str
    status: str
    confidence: float
    timestamp: datetime
    session_id: Optional[str]


# ─── Conflict API Schemas ─────────────────────────────────────────────────────

class ConflictListResponse(BaseModel):
    conflicts: List[ConflictItem]
    total: int


# ─── System / Stats Schemas ───────────────────────────────────────────────────

class SystemStats(BaseModel):
    total_documents: int
    indexed_documents: int
    failed_documents: int
    total_chunks: int
    total_queries: int
    detected_conflicts: int
    supported_formats: List[str]
    avg_retrieval_latency_ms: Optional[float]
    recent_uploads: List[DocumentOut]


class HealthResponse(BaseModel):
    status: str
    version: str
    embedding_model: str
    llm_provider: str
    llm_model: str
    vector_store: str
    database: str


class SettingsOut(BaseModel):
    llm_provider: str
    llm_model: str
    embedding_model: str
    max_chunk_size: int
    chunk_overlap: int
    retrieval_top_k: int
    rerank_top_k: int
    semantic_weight: float
    bm25_weight: float
    confidence_threshold: float
    low_confidence_threshold: float


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    retrieval_top_k: Optional[int] = None
    rerank_top_k: Optional[int] = None
    semantic_weight: Optional[float] = None
    bm25_weight: Optional[float] = None
    confidence_threshold: Optional[float] = None
    low_confidence_threshold: Optional[float] = None


# ─── Evaluation Schemas ───────────────────────────────────────────────────────

class EvaluationRunRequest(BaseModel):
    dataset_path: Optional[str] = None  # defaults to bundled dataset
    top_k: Optional[int] = 5
    max_questions: Optional[int] = None  # None = run all


class MetricResult(BaseModel):
    metric: str
    value: float
    description: str


class EvaluationResults(BaseModel):
    run_id: str
    timestamp: datetime
    dataset_size: int
    retrieval_metrics: List[MetricResult]
    answer_metrics: List[MetricResult]
    security_metrics: List[MetricResult]
    category_breakdown: Dict[str, Any]
    failed_cases: List[Dict[str, Any]]
    summary: str

