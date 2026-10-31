# API Documentation — Enterprise Documentation Q&A Assistant

Base URL: `http://localhost:8000/api`  
Interactive Swagger UI: `http://localhost:8000/docs`

---

## 1. Document Management Endpoints

### Ingest Document
- **POST** `/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file`: Document file (PDF, HTML, MD, TXT, max 50MB)
  - `department`: (Optional) e.g., "HR", "IT", "Finance", "Engineering"
  - `team`: (Optional) Department-specific team identifier
  - `document_version`: (Optional) e.g., "v2.1"
  - `effective_date`: (Optional) ISO format date (YYYY-MM-DD)
  - `access_scope`: (Optional) "public" | "internal" | "restricted"
- **Response:** `202 Accepted` with `DocumentOut` metadata object.

### List Documents
- **GET** `/documents`
- **Query Params:**
  - `department`: Filter by department
  - `status`: "pending" | "processing" | "indexed" | "failed"
  - `file_type`: "pdf" | "html" | "md" | "txt"
- **Response:** `200 OK`
```json
{
  "documents": [ ... ],
  "total": 8
}
```

### Inspect Document Chunks
- **GET** `/documents/{document_id}/chunks`
- **Response:** `200 OK` Array of `ChunkOut` objects containing chunk ID, original text, section titles, page references, and metadata.

### Re-index Document
- **POST** `/documents/{document_id}/reindex`
- **Response:** `200 OK` Document record with status reset to "pending".

### Delete Document
- **DELETE** `/documents/{document_id}`
- **Response:** `204 No Content`

---

## 2. Chat / Query Endpoints

### Submit Natural Language Question
- **POST** `/chat/query`
- **Request Body:**
```json
{
  "question": "What is the reimbursement limit for international hotel stays?",
  "session_id": "optional-session-uuid",
  "filters": {
    "department": "Finance"
  },
  "top_k": 10
}
```
- **Response:** `200 OK`
```json
{
  "question": "What is the reimbursement limit for international hotel stays?",
  "answer": "The maximum hotel accommodation reimbursement for international business travel is $250 per night [Source 1].",
  "status": "answered",
  "confidence": 0.94,
  "citations": [
    {
      "citation_id": "1",
      "chunk_id": "9a3f2b84-...",
      "source_document": "Finance_Reimbursement_Policy.txt",
      "section_title": "1.2 International Travel",
      "page_number": null,
      "document_version": "v3.0",
      "excerpt": "Hotel accommodation: Maximum $250 per night"
    }
  ],
  "conflicts": [],
  "clarification_required": false,
  "clarification_question": null,
  "latency_ms": 182.4
}
```

### Chat History
- **GET** `/chat/history`
- **Query Params:** `session_id` (optional), `limit` (default: 50)
- **Response:** `200 OK` Array of past queries and status.

### Query Feedback
- **POST** `/chat/feedback`
- **Request Body:**
```json
{
  "query_id": "uuid-here",
  "feedback": "positive",
  "comment": "Accurate citations and grounded excerpt"
}
```

---

## 3. Conflict Analysis Endpoints

### List Policy Conflicts
- **GET** `/conflicts`
- **Response:** `200 OK`
```json
{
  "conflicts": [
    {
      "conflict_id": "conf-001",
      "conflict_type": "version",
      "topic": "Password Rotation",
      "document_a": "IT_Access_Policy_v1.txt",
      "document_b": "IT_Access_Policy_v2.html",
      "statement_a": "All passwords must be changed every 90 days.",
      "statement_b": "All employee passwords must be changed every 180 days.",
      "severity": "high",
      "resolution_status": "unresolved"
    }
  ],
  "total": 2
}
```

---

## 4. Evaluation Endpoints

### Run Benchmark
- **POST** `/evaluation/run`
- **Request Body:** `{"top_k": 5, "max_questions": null}`
- **Response:** `200 OK` `{"run_id": "...", "status": "started"}`

### Get Benchmark Results
- **GET** `/evaluation/results`
- **Response:** `200 OK` Full breakdown of MRR, Precision@K, Recall@K, Faithfulness, Citation accuracy, Injection defense rate.

---

## 5. System Endpoints

### Health Check
- **GET** `/health`
- **Response:** `{"status": "ok", "version": "1.0.0", "vector_store": "FAISS", ...}`

### System Stats
- **GET** `/stats`
- **Response:** Real-time counts of documents, chunks, queries, conflicts, avg latency.

### Settings
- **GET** `/settings`
- **PATCH** `/settings` (Runtime tuning of hybrid weights, top-k, and confidence thresholds)

