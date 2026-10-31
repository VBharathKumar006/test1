export interface DocumentItem {
  id: string;
  filename: string;
  document_title?: string;
  file_type: string;
  file_size?: number;
  department?: string;
  team?: string;
  document_category?: string;
  document_version?: string;
  effective_date?: string;
  access_scope?: string;
  document_status?: string;
  upload_timestamp?: string;
  processing_status: 'pending' | 'processing' | 'indexed' | 'failed';
  processing_error?: string;
  chunk_count: number;
  indexed_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  original_text: string;
  section_title?: string;
  parent_heading?: string;
  page_number?: number;
  document_title?: string;
  source_filename?: string;
  department?: string;
  team?: string;
  document_version?: string;
  effective_date?: string;
}

export interface Citation {
  citation_id: string;
  chunk_id: string;
  document_id: string;
  source_document: string;
  document_title?: string;
  section_title?: string;
  page_number?: number;
  document_version?: string;
  effective_date?: string;
  department?: string;
  team?: string;
  excerpt: string;
  relevance_score: number;
}

export interface ConflictItem {
  conflict_id: string;
  conflict_type: string;
  topic?: string;
  document_a: string;
  document_b: string;
  version_a?: string;
  version_b?: string;
  effective_date_a?: string;
  effective_date_b?: string;
  department_a?: string;
  department_b?: string;
  team_a?: string;
  team_b?: string;
  statement_a: string;
  statement_b: string;
  severity: string;
  resolution_status: string;
  explanation?: string;
}

export interface RetrievalMetadata {
  chunk_ids: string[];
  semantic_scores: number[];
  bm25_scores: number[];
  rerank_scores: number[];
  final_scores: number[];
  filters_applied?: Record<string, any>;
  retrieval_latency_ms: number;
}

export interface QueryResponse {
  question: string;
  answer: string;
  status: 'answered' | 'insufficient_evidence' | 'conflicting' | 'clarification_needed' | 'error';
  confidence: number;
  citations: Citation[];
  supporting_passages: string[];
  conflicts: ConflictItem[];
  clarification_required: boolean;
  clarification_question?: string;
  retrieval_metadata?: RetrievalMetadata;
  session_id?: string;
  query_id: string;
  latency_ms: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  responseMeta?: QueryResponse;
}

export interface SystemStats {
  total_documents: number;
  indexed_documents: number;
  failed_documents: number;
  total_chunks: number;
  total_queries: number;
  detected_conflicts: number;
  supported_formats: string[];
  avg_retrieval_latency_ms?: number;
  recent_uploads: DocumentItem[];
}

export interface MetricResult {
  metric: string;
  value: number;
  description: string;
}

export interface EvaluationResults {
  run_id: string;
  timestamp: string;
  dataset_size: number;
  retrieval_metrics: MetricResult[];
  answer_metrics: MetricResult[];
  security_metrics: MetricResult[];
  category_breakdown: Record<string, { total: number; correct: number }>;
  failed_cases: Array<{ question: string; error: string }>;
  summary: string;
}

export interface AppSettings {
  llm_provider: string;
  llm_model: string;
  embedding_model: string;
  max_chunk_size: number;
  chunk_overlap: number;
  retrieval_top_k: number;
  rerank_top_k: number;
  semantic_weight: number;
  bm25_weight: number;
  confidence_threshold: number;
  low_confidence_threshold: number;
}

