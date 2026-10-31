"""
Cross-encoder reranking service.
Reranks retrieved candidates using a cross-encoder for higher precision.
"""
import logging
from typing import List, Tuple, Any

logger = logging.getLogger(__name__)


class RerankerService:
    """Cross-encoder reranker for improving retrieval precision."""

    def __init__(self):
        self._model = None
        self._enabled = True

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                logger.info("Loading cross-encoder reranker: cross-encoder/ms-marco-MiniLM-L-6-v2")
                self._model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
                logger.info("Cross-encoder loaded.")
            except Exception as e:
                logger.warning(f"Cross-encoder load failed: {e}. Reranking disabled.")
                self._enabled = False
        return self._model

    def rerank(
        self,
        query: str,
        chunks: List[Any],   # List of DocumentChunk ORM objects
        top_k: int = 5,
    ) -> List[Tuple[Any, float]]:
        """
        Rerank a list of chunks using the cross-encoder.
        Returns list of (chunk, score) sorted by score descending.
        """
        if not chunks:
            return []

        if not self._enabled:
            # No reranker — return as-is with score 0
            return [(chunk, 0.0) for chunk in chunks[:top_k]]

        model = self._load_model()
        if model is None:
            return [(chunk, 0.0) for chunk in chunks[:top_k]]

        # Build (query, passage) pairs
        pairs = [(query, chunk.original_text[:512]) for chunk in chunks]

        try:
            scores = model.predict(pairs, batch_size=8, show_progress_bar=False)
            ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
            return [(chunk, float(score)) for chunk, score in ranked[:top_k]]
        except Exception as e:
            logger.error(f"Reranking error: {e}. Returning unranked.")
            return [(chunk, 0.0) for chunk in chunks[:top_k]]


reranker_service = RerankerService()

