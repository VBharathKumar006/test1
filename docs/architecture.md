# System Architecture & Technical Specification

> **Project:** Enterprise Documentation Q&A Assistant  
> **Company Context:** Doomsday Enterprise  
> **Engineering Scope:** Grounded RAG, Conflict Detection, Prompt Injection Defense

---

## 1. High-Level Architecture

The system is constructed with a decoupled full-stack architecture:
- **Frontend Presentation Tier:** React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, Recharts.
- **Backend API Tier:** FastAPI, Pydantic v2, Python 3.12, Uvicorn, SQLite metadata repository.
- **Retrieval & RAG Tier:** Sentence-Transformers (`all-MiniLM-L6-v2`), FAISS vector store, `rank-bm25` keyword engine, Reciprocal Rank Fusion (RRF), Cross-Encoder reranking (`ms-marco-MiniLM-L-6-v2`).
- **Generation & Safety Tier:** Provider-agnostic LLM interface (Gemini 1.5 Flash / OpenAI-compatible), Multi-signal confidence scorer, Pairwise conflict detector, Untrusted delimiter security boundary.

```
+-----------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                       |
|  [Overview]  [Ask Assistant]  [Document Library]  [Upload]  [Conflicts]  [Evaluation]   |
+-----------------------------------------------------------------------------------------+
                                           | HTTP REST / JSON
                                           v
+-----------------------------------------------------------------------------------------+
|                               FASTAPI APPLICATION GATEWAY                               |
|        /api/documents        /api/chat        /api/conflicts        /api/evaluation     |
+-----------------------------------------------------------------------------------------+
           |                                                      |
           v                                                      v
+-----------------------+                              +-----------------------+
|  INGESTION PIPELINE   |                              |  RETRIEVAL PIPELINE   |
| 1. Format Detection   |                              | 1. Query Preprocess   |
| 2. Security Scan      |                              | 2. FAISS Semantic     |
| 3. HTML Sanitization  |                              | 3. BM25 Keyword       |
| 4. Content Cleaning   |                              | 4. RRF Rank Fusion    |
| 5. Heading Chunking   |                              | 5. Cross-Encoder      |
| 6. Metadata Enrich    |                              | 6. Metadata Filters   |
+-----------------------+                              +-----------------------+
           |                                                      |
           v                                                      v
+-----------------------------------------------------------------------------------------+
|                                 GROUNDED ANSWER SYNTHESIS                               |
| 1. Injection Defense: Untrusted <evidence> encapsulation                                |
| 2. Pairwise Policy Conflict Detection (Version, Team Scope, Dates)                      |
| 3. Evidence Grounding & Verifiable Citation Extraction                                  |
| 4. Multi-Signal Composite Confidence Assessment                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Ingestion & Content Preparation (FR-01 & FR-02)

### Supported Formats & Parsers
- **PDF (.pdf):** Extracted via `pdfplumber` to preserve page numbers and detect section headings via font size heuristics and uppercase cues.
- **HTML (.html, .htm):** Parsed using `BeautifulSoup4` with `lxml`. Script tags, iframes, and inline event handlers are removed by the security layer prior to parsing.
- **Markdown (.md):** Hierarchical regex parser preserving `#` to `######` headers and attaching parent context to sub-sections.
- **Plain Text (.txt):** Parsed using section boundary heuristics (capitalized title lines, underline dashes, numeric enumerations).

### Heading-Aware Recursive Chunking
Rather than naive character-count chunking, chunks are aligned with section boundaries:
- **Target Chunk Size:** ~700 tokens (~2,800 characters)
- **Overlap:** ~100 tokens (~400 characters)
- **Heading Context Injection:** Every chunk is prefixed with `[Section: <Parent Heading>]` so that policy conditions remain coupled with their parent rules even when retrieved independently.

---

## 3. Hybrid Retrieval & Reranking (FR-03)

### Dual-Stage Retrieval
1. **Semantic Vector Search:** 384-dimensional dense vectors indexed via FAISS `IndexFlatIP` (normalized inner product = cosine similarity).
2. **Keyword BM25 Search:** Pure Python BM25Okapi index targeting exact tokens, version numbers, currency values, and policy codes.
3. **Reciprocal Rank Fusion (RRF):**
   $$\text{RRF Score}(d) = w_{\text{sem}} \cdot \frac{1}{k + r_{\text{sem}}(d)} + w_{\text{bm25}} \cdot \frac{1}{k + r_{\text{bm25}}(d)}$$
   Default configuration: $k=60, w_{\text{sem}}=0.6, w_{\text{bm25}}=0.4$.

### Cross-Encoder Reranking
Top-10 fused candidates are scored by `cross-encoder/ms-marco-MiniLM-L-6-v2` taking `(query, passage)` pairs to capture deep interaction and semantics before generating the evidence prompt.

---

## 4. Grounded Answer Synthesis & Citations (FR-04 & FR-05)

- **Mandatory System Prompt:** 10 strict enterprise rules enforcing evidence-only answering, zero outside knowledge, and explicit fallback when evidence is missing.
- **Verifiable Citations:** Each factual assertion links to a citation object containing:
  - Source document name
  - Section title
  - Page number (for PDFs)
  - Document version
  - Exact verbatim supporting excerpt
- **Anti-Hallucination Validation:** The backend validates every generated citation against the list of retrieved chunk IDs; non-retrieved references are rejected.

---

## 5. Contradiction & Version Conflict Handling (FR-06)

Enterprise documents frequently contain conflicting guidance across superseded versions or departmental overrides:
1. **Candidate Pair Discovery:** Topic keywords are matched across retrieved chunks from different documents.
2. **Pairwise Conflict Analysis:** LLM / heuristic analyzer assesses if statements differ in numeric values, requirements, or deadlines.
3. **Classification:**
   - *Version conflict* (older vs newer active policy)
   - *Team-specific variation* (e.g. Engineering 2 days remote vs HR 3 days remote)
   - *Date-based variation* (effective date phase-in)
   - *Direct contradiction*
4. **Transparent Presentation:** The system never silently chooses one policy; both sides are presented with respective document versions and dates.

---

## 6. Security & Multi-Format Injection Protection (Phase 7)

- **Untrusted Evidence Delimiters:** Every retrieved passage is encapsulated in `<evidence id="...">...</evidence>`.
- **System Prompt Integrity:** The LLM is explicitly instructed that evidence content is data, never instructions.
- **Pre-Ingestion Pattern Scanner:** Text is scanned for regex attack patterns (`ignore previous instructions`, `you are now unrestricted`, etc.) and flagged.
- **Credential Protection:** API keys and environment variables are never passed to the LLM or query logs.

