# Architecture and Technical Decisions

> **Project:** Enterprise Documentation Q&A Assistant
> **Hackathon:** HCLTech Future Ready AI Engineer
> **Last Updated:** 2026-10-31

---

## Decision 001 — Frontend Framework

**Date:** 2026-10-31
**Category:** Frontend Architecture
**Status:** Accepted

**Context:**
A modern, responsive enterprise-grade UI is required. The framework must support TypeScript, fast development iteration, and component-based design.

**Decision:** React 18 with Vite + TypeScript

**Alternatives considered:**
- Next.js — full-stack SSR, overkill for a hackathon SPA
- Vue.js — good but less TypeScript ecosystem support
- Angular — verbose and heavy for a prototype
- Svelte — smaller community, less library availability

**Reason for selection:**
React is the industry standard for enterprise SaaS dashboards. Vite provides extremely fast HMR. TypeScript enables type-safe API contracts. Large ecosystem of UI libraries (Recharts, Lucide, etc.).

**Trade-offs:**
- SPA, no SSR (acceptable for internal enterprise tool)
- Bundle size larger than Svelte alternatives

**Impact:** All frontend components, routing, and state management.

---

## Decision 002 — Styling System

**Date:** 2026-10-31
**Category:** Frontend Architecture
**Status:** Accepted

**Context:**
Need a consistent design system that produces professional enterprise-grade UI rapidly.

**Decision:** Tailwind CSS with a custom dark-blue enterprise color palette

**Alternatives considered:**
- Material UI — heavy, opinionated
- Chakra UI — good but adds component abstraction layer
- CSS Modules — slower to build consistent design system

**Reason for selection:**
Tailwind utility-first approach enables rapid custom design without wrestling with component library opinions. Enterprise SaaS tools commonly use custom Tailwind setups.

**Trade-offs:**
- JSX className verbosity
- Requires Tailwind config discipline

**Impact:** All UI components.

---

## Decision 003 — Backend Framework

**Date:** 2026-10-31
**Category:** Backend Architecture
**Status:** Accepted

**Context:**
Need a high-performance Python API layer that supports async operations, background tasks, and auto-generated OpenAPI documentation.

**Decision:** FastAPI with Uvicorn

**Alternatives considered:**
- Flask — synchronous, less suited for async document processing
- Django REST Framework — too heavy, ORM-first
- Starlette directly — FastAPI is built on Starlette, adds ergonomics

**Reason for selection:**
FastAPI's async support handles concurrent document processing and LLM calls efficiently. Auto-generated Swagger UI satisfies documentation requirements. Pydantic v2 integration provides strong schema validation.

**Trade-offs:**
- Less opinionated than Django (requires more setup decisions)
- Async programming model requires care

**Impact:** All backend API routes, background processing, schema validation.

---

## Decision 004 — Embedding Model

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
Need a high-quality sentence embedding model that works locally without API costs, within hackathon budget constraints.

**Decision:** `sentence-transformers/all-MiniLM-L6-v2`

**Alternatives considered:**
- OpenAI text-embedding-3-small — paid API, adds cost per query
- BGE-large — higher quality but requires 1.3GB RAM, slow on CPU
- all-mpnet-base-v2 — better quality but slower inference
- Google text-embedding-004 — paid API

**Reason for selection:**
`all-MiniLM-L6-v2` offers the best speed/quality tradeoff for local CPU inference. 384-dimension embeddings are compact (less FAISS memory). Well-benchmarked on information retrieval tasks. Free and runs offline.

**Trade-offs:**
- 512 token limit per chunk (managed by chunking strategy)
- Lower quality than larger models like BGE-large

**Impact:** Embedding generation, FAISS index size, retrieval quality.

---

## Decision 005 — Vector Database

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
Need a vector similarity search solution that runs locally, persists to disk, and handles tens of thousands of chunks.

**Decision:** FAISS (Facebook AI Similarity Search) with flat L2 index

**Alternatives considered:**
- ChromaDB — higher-level API but additional process/server complexity
- Qdrant — excellent but requires Docker or separate server
- Pinecone — cloud-only, paid
- Weaviate — heavy, requires Docker

**Reason for selection:**
FAISS is battle-tested, pure Python compatible, stores directly to disk as files. No server process needed. Scales to millions of vectors. IVF index can be added when scale requires it.

**Trade-offs:**
- No built-in metadata filtering (handled by SQLite pre-filtering)
- Flat index is O(n) for small collections; acceptable at hackathon scale
- No real-time update (requires index rebuild on new documents)

**Impact:** Vector storage, retrieval latency, index persistence.

---

## Decision 006 — Keyword Search

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
Pure semantic search misses exact keyword matches (model names, policy numbers, version identifiers). Hybrid retrieval improves both precision and recall.

**Decision:** BM25 via `rank-bm25` library

**Alternatives considered:**
- Elasticsearch — requires separate server, overkill
- Whoosh — pure Python but slower
- TF-IDF with cosine — simpler but lower quality than BM25
- Solr — heavy infrastructure

**Reason for selection:**
`rank-bm25` is a pure Python BM25 implementation. No server required. Serializable to disk with pickle. Well-established IR baseline that complements semantic search.

**Trade-offs:**
- In-memory index rebuilt on startup from serialized state
- Less feature-rich than Elasticsearch

**Impact:** Keyword retrieval leg of hybrid search.

---

## Decision 007 — Hybrid Fusion Algorithm

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
Semantic and keyword search return separate ranked lists that must be fused into a single ranked result.

**Decision:** Reciprocal Rank Fusion (RRF) with k=60

**Alternatives considered:**
- Linear score combination — requires score normalization across different scales
- CombSUM — sensitive to score distribution differences
- Learned fusion — requires training data

**Reason for selection:**
RRF is parameter-robust and does not require score normalization. The k=60 constant suppresses rank position noise. Proven in academic literature for hybrid IR. No training required.

**Trade-offs:**
- Ignores score magnitudes (only uses rank positions)
- Equal weighting by default; configurable via settings

**Impact:** Retrieval quality for all queries.

---

## Decision 008 — Reranking

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
First-stage retrieval returns candidates. A reranker improves precision before sending passages to LLM.

**Decision:** `cross-encoder/ms-marco-MiniLM-L-6-v2`

**Alternatives considered:**
- No reranking — lower precision
- Cohere Rerank — paid API
- BGE reranker — larger, slower
- Flashrank — lightweight alternative

**Reason for selection:**
ms-marco cross-encoders are specifically trained on passage relevance ranking. MiniLM-L-6 variant is fast on CPU (~300ms for 10 candidates). Free, local, offline.

**Trade-offs:**
- Adds ~300ms latency per query
- CPU inference; slower than GPU

**Impact:** Answer quality, query latency.

---

## Decision 009 — LLM Provider

**Date:** 2026-10-31
**Category:** Generation
**Status:** Accepted

**Context:**
Need an LLM for grounded answer generation. Must be accessible on free tier for development and demonstrations.

**Decision:** Google Gemini API (gemini-1.5-flash) as primary, with provider-independent interface

**Alternatives considered:**
- GPT-4o — paid, no free tier
- Claude — paid
- Mistral API — free tier available but less capable
- Local Ollama — requires 8GB+ RAM, setup complexity

**Reason for selection:**
Gemini 1.5 Flash has generous free tier (60 RPM, 1500 RPD). Strong performance on document-grounded Q&A. Google API aligns with hackathon context (HCLTech + Google partnership implied). Provider abstraction allows swapping.

**Trade-offs:**
- Requires internet connectivity
- Rate limits on free tier
- Not fully local

**Impact:** Answer generation, latency, API costs.

---

## Decision 010 — Document Storage

**Date:** 2026-10-31
**Category:** Storage
**Status:** Accepted

**Context:**
Uploaded documents need to be stored and accessible. Metadata needs to be queryable.

**Decision:** Local filesystem for file storage + SQLite for metadata

**Alternatives considered:**
- PostgreSQL — requires separate server, overkill
- MongoDB — requires separate server
- S3 + RDS — cloud, not needed for hackathon

**Reason for selection:**
Zero infrastructure overhead. SQLite is file-based, ACID-compliant, and handles concurrent reads well. Local filesystem stores the actual documents. Metadata in SQLite allows SQL queries for filtering.

**Trade-offs:**
- Not horizontally scalable
- SQLite write concurrency limited (acceptable for single-server prototype)

**Impact:** Document management, metadata filtering, persistence.

---

## Decision 011 — Chunking Strategy

**Date:** 2026-10-31
**Category:** RAG Pipeline
**Status:** Accepted

**Context:**
Naive fixed-length chunking breaks mid-sentence and separates headings from their content. Enterprise documents have hierarchical structure (sections, subsections) that should be preserved.

**Decision:** Structure-aware recursive heading-based chunking (~700 tokens, 100 overlap)

**Alternatives considered:**
- Fixed-size character splitting — loses structure
- Sentence splitting — chunks too small for policy statements
- Semantic chunking — computationally expensive, marginal improvement

**Reason for selection:**
Heading-based chunking keeps policy sections together. 700-token chunks balance context richness vs. retrieval noise. 100-token overlap prevents boundary artifacts. Configurable for tuning.

**Trade-offs:**
- Sections larger than 700 tokens get split at sentence boundaries
- Very short sections may be merged with adjacent content

**Impact:** Retrieval quality, answer groundedness.

---

## Decision 012 — Conflict Detection Strategy

**Date:** 2026-10-31
**Category:** Answer Generation
**Status:** Accepted

**Context:**
Enterprise document collections frequently contain outdated policies alongside newer versions. The system must identify these contradictions rather than silently selecting one.

**Decision:** Two-stage conflict detection: (1) keyword overlap heuristic to identify same-topic passages, (2) LLM pairwise comparison with structured output

**Alternatives considered:**
- Pure LLM comparison — expensive for all pairs
- NLI model (entailment/contradiction classification) — requires fine-tuned model
- Edit distance — word-level, misses semantic contradictions

**Reason for selection:**
Keyword overlap efficiently narrows candidate pairs. LLM comparison catches semantic contradictions that keyword methods miss. Structured output enables programmatic conflict classification.

**Trade-offs:**
- Additional LLM call per conflict candidate set
- Heuristic topic clustering may miss some conflicts

**Impact:** Conflict detection accuracy, latency.

---

## Decision 013 — Confidence Scoring

**Date:** 2026-10-31
**Category:** Answer Generation
**Status:** Accepted

**Context:**
The system must know when it lacks sufficient evidence rather than hallucinating an answer.

**Decision:** Multi-signal confidence scoring: retrieval relevance scores + passage agreement + conflict severity + query-evidence coverage

**Alternatives considered:**
- LLM self-reported confidence — unreliable, known to be overconfident
- Single threshold on top-1 similarity — too crude

**Reason for selection:**
Multi-signal approach is more robust than any single signal. Each signal catches different failure modes (low retrieval score, disagreeing passages, detected conflicts, unanswerable queries).

**Trade-offs:**
- Requires threshold calibration against evaluation data
- More complex implementation

**Impact:** Fallback behaviour, user trust.

---

## Decision 014 — Prompt Injection Defense

**Date:** 2026-10-31
**Category:** Security
**Status:** Accepted

**Context:**
Documents are untrusted inputs. Malicious documents may embed instructions targeting the LLM.

**Decision:** Multi-layer defense: (1) XML/delimiter tagging of evidence passages, (2) injection pattern detection in documents, (3) strict system prompt forbidding instruction execution, (4) citation validation against actual retrieved content

**Alternatives considered:**
- Single system prompt instruction only — insufficient
- Input sanitization only — misses semantic attacks
- Separate sandboxed LLM for document processing — complex

**Reason for selection:**
Defense in depth is the only reliable approach. Clear delimiter separation makes it structurally difficult for document content to be interpreted as system instructions. Pattern detection catches obvious attacks.

**Trade-offs:**
- Pattern detection has false positives on legitimate procedural documents
- No defense is 100% — documents with carefully crafted semantic attacks may still influence outputs

**Impact:** Security posture, retrieval pipeline, system prompt design.

---

## Decision 015 — Evaluation Framework

**Date:** 2026-10-31
**Category:** Evaluation
**Status:** Accepted

**Context:**
The system's accuracy and reliability claims must be measurable and reproducible.

**Decision:** Offline evaluation using a labelled JSONL dataset (50+ questions) with automated metric calculation for retrieval (Precision@K, Recall@K, MRR, nDCG) and programmatic faithfulness checking

**Alternatives considered:**
- RAGAS framework — additional dependency, requires LLM judge
- Human evaluation only — not reproducible at hackathon scale
- LLM-as-judge for all metrics — expensive and circular

**Reason for selection:**
Offline evaluation with labelled ground truth is the gold standard. Retrieval metrics are deterministic. Faithfulness checking uses a separate lightweight LLM call to avoid circular evaluation. JSONL is simple and auditable.

**Trade-offs:**
- Labelled dataset construction is manual effort
- Semantic quality metrics still require LLM judge

**Impact:** Evaluation credibility, development feedback loop.

---

*This log is updated throughout development. Decisions marked Proposed have not yet been implemented.*

