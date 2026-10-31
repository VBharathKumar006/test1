"""
Hybrid retrieval: BM25 keyword search + FAISS semantic search fused with RRF.
"""
import logging
import pickle
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)


class BM25Index:
    """Manages BM25 keyword index over document chunks."""

    def __init__(self):
        self._bm25 = None
        self._chunk_ids: List[str] = []
        self._corpus: List[List[str]] = []

    def _get_path(self) -> Path:
        from app.core.config import settings
        return Path(settings.VECTOR_STORE_PATH) / "bm25_index.pkl"

    def load(self):
        path = self._get_path()
        if path.exists():
            try:
                with open(path, "rb") as f:
                    data = pickle.load(f)
                self._bm25 = data["bm25"]
                self._chunk_ids = data["chunk_ids"]
                self._corpus = data.get("corpus", [])
                logger.info(f"BM25 index loaded: {len(self._chunk_ids)} chunks.")
            except Exception as e:
                logger.warning(f"BM25 load failed: {e}. Starting fresh.")

    def add_chunks(self, chunk_ids: List[str], texts: List[str]):
        """Add new chunks to the BM25 index."""
        from rank_bm25 import BM25Okapi
        new_tokenized = [self._tokenize(t) for t in texts]
        self._corpus.extend(new_tokenized)
        self._chunk_ids.extend(chunk_ids)
        self._bm25 = BM25Okapi(self._corpus)
        self._save()

    def remove_chunks(self, chunk_ids_to_remove: List[str]):
        """Rebuild BM25 index without specified chunks."""
        from rank_bm25 import BM25Okapi
        remove_set = set(chunk_ids_to_remove)
        kept = [(cid, corp) for cid, corp in zip(self._chunk_ids, self._corpus)
                if cid not in remove_set]
        if not kept:
            self._bm25 = None
            self._chunk_ids = []
            self._corpus = []
        else:
            self._chunk_ids, self._corpus = zip(*kept)
            self._chunk_ids = list(self._chunk_ids)
            self._corpus = list(self._corpus)
            self._bm25 = BM25Okapi(self._corpus)
        self._save()

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        if self._bm25 is None:
            self.load()
        if self._bm25 is None or not self._chunk_ids:
            return []
        tokens = self._tokenize(query)
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(
            zip(self._chunk_ids, scores),
            key=lambda x: x[1],
            reverse=True
        )
        return [(cid, float(score)) for cid, score in ranked[:top_k] if score > 0]

    def _tokenize(self, text: str) -> List[str]:
        import re
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens

    def _save(self):
        path = self._get_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({
                "bm25": self._bm25,
                "chunk_ids": self._chunk_ids,
                "corpus": self._corpus,
            }, f)


class HybridRetriever:
    """
    Combines FAISS semantic search and BM25 keyword search
    using Reciprocal Rank Fusion (RRF).
    """

    def __init__(self):
        self.bm25_index = BM25Index()

    def _rrf_score(self, rank: int, k: int = 60) -> float:
        return 1.0 / (k + rank + 1)

    def fuse_results(
        self,
        semantic_results: List[Tuple[str, float]],
        bm25_results: List[Tuple[str, float]],
        semantic_weight: float = 0.6,
        bm25_weight: float = 0.4,
        rrf_k: int = 60,
    ) -> List[Tuple[str, float, float, float]]:
        """
        RRF fusion of two ranked lists.
        Returns list of (chunk_id, rrf_score, semantic_score, bm25_score).
        """
        from app.core.config import settings

        # Build score lookup maps
        semantic_map = {cid: score for cid, score in semantic_results}
        bm25_map = {cid: score for cid, score in bm25_results}

        # All candidate chunk IDs
        all_ids = set(semantic_map.keys()) | set(bm25_map.keys())

        rrf_scores: Dict[str, float] = {}

        # RRF from semantic ranking
        for rank, (cid, _) in enumerate(semantic_results):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + semantic_weight * self._rrf_score(rank, rrf_k)

        # RRF from BM25 ranking
        for rank, (cid, _) in enumerate(bm25_results):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + bm25_weight * self._rrf_score(rank, rrf_k)

        # Sort by combined RRF score
        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for cid, rrf_score in ranked:
            sem_score = semantic_map.get(cid, 0.0)
            bm25_score = bm25_map.get(cid, 0.0)
            results.append((cid, rrf_score, sem_score, bm25_score))

        return results

    async def retrieve(
        self,
        query: str,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        db=None,
    ) -> Dict[str, Any]:
        """
        Full hybrid retrieval pipeline.
        Returns dict with ranked chunks and metadata.
        """
        from app.services.embeddings.embedding_service import embedding_service
        from app.core.config import settings

        # 1. Semantic search
        semantic_results = embedding_service.search(query, top_k=top_k * 2)

        # 2. BM25 search
        bm25_results = self.bm25_index.search(query, top_k=top_k * 2)

        # 3. Fuse with RRF
        fused = self.fuse_results(
            semantic_results,
            bm25_results,
            semantic_weight=settings.SEMANTIC_WEIGHT,
            bm25_weight=settings.BM25_WEIGHT,
            rrf_k=settings.RRF_K,
        )

        # 4. Apply metadata filters if db provided
        candidate_ids = [item[0] for item in fused]
        chunk_records = []

        if db and candidate_ids:
            chunk_records = await self._load_chunks(db, candidate_ids, filters)

        # Build score map for retrieved chunks
        score_map = {cid: (rrf, sem, bm25) for cid, rrf, sem, bm25 in fused}

        return {
            "candidates": fused[:top_k],
            "chunk_records": chunk_records,
            "semantic_results": semantic_results,
            "bm25_results": bm25_results,
            "score_map": score_map,
        }

    async def _load_chunks(
        self,
        db,
        chunk_ids: List[str],
        filters: Optional[Dict[str, Any]],
    ):
        """Load chunk records from DB, applying metadata filters."""
        from sqlalchemy import select, and_
        from app.models.document_models import DocumentChunk

        query = select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids))

        if filters:
            conditions = []
            if filters.get("department"):
                conditions.append(DocumentChunk.department == filters["department"])
            if filters.get("team"):
                conditions.append(DocumentChunk.team == filters["team"])
            if filters.get("document_version"):
                conditions.append(DocumentChunk.document_version == filters["document_version"])
            if conditions:
                query = query.where(and_(*conditions))

        result = await db.execute(query)
        chunks = result.scalars().all()

        # Re-sort by RRF order
        chunk_map = {c.id: c for c in chunks}
        ordered = [chunk_map[cid] for cid in chunk_ids if cid in chunk_map]
        return ordered


hybrid_retriever = HybridRetriever()

