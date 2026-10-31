"""
Embedding generation and FAISS vector store management.
Lazy-loads the model on first use to minimize startup time.
"""
import logging
import os
import pickle
import numpy as np
from pathlib import Path
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates sentence embeddings and manages the FAISS vector index."""

    def __init__(self):
        self._model = None
        self._index = None           # FAISS index
        self._chunk_ids: List[str] = []   # FAISS position → chunk_id mapping
        self._index_path: Optional[Path] = None
        self._meta_path: Optional[Path] = None

    def _load_model(self):
        """Lazy-load the sentence transformer model."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            from app.core.config import settings
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded.")
        return self._model

    def _get_paths(self) -> Tuple[Path, Path]:
        from app.core.config import settings
        base = Path(settings.VECTOR_STORE_PATH)
        base.mkdir(parents=True, exist_ok=True)
        return base / "faiss.index", base / "faiss_meta.pkl"

    def load_index(self):
        """Load existing FAISS index from disk if available."""
        import faiss
        idx_path, meta_path = self._get_paths()
        self._index_path = idx_path
        self._meta_path = meta_path

        if idx_path.exists() and meta_path.exists():
            try:
                self._index = faiss.read_index(str(idx_path))
                with open(meta_path, "rb") as f:
                    self._chunk_ids = pickle.load(f)
                logger.info(f"FAISS index loaded: {self._index.ntotal} vectors, {len(self._chunk_ids)} chunk IDs.")
            except Exception as e:
                logger.warning(f"Could not load FAISS index: {e}. Starting fresh.")
                self._index = None
                self._chunk_ids = []
        else:
            logger.info("No existing FAISS index found. Will create on first embedding.")

    def _ensure_index(self, dim: int):
        """Create FAISS index if it doesn't exist."""
        import faiss
        if self._index is None:
            self._index = faiss.IndexFlatIP(dim)  # Inner product (for normalized = cosine)
            logger.info(f"Created new FAISS IndexFlatIP with dim={dim}.")

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Generate normalized embeddings for a list of texts."""
        import faiss
        model = self._load_model()
        embeddings = model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embeddings.astype(np.float32)

    def add_chunks(self, chunk_ids: List[str], texts: List[str]) -> List[int]:
        """
        Embed texts and add to FAISS index.
        Returns list of FAISS index IDs.
        """
        import faiss

        if not texts:
            return []

        embeddings = self.embed_texts(texts)
        self._ensure_index(embeddings.shape[1])

        # Track starting position before add
        start_pos = self._index.ntotal
        self._index.add(embeddings)
        self._chunk_ids.extend(chunk_ids)

        self._save_index()
        positions = list(range(start_pos, start_pos + len(chunk_ids)))
        logger.info(f"Added {len(chunk_ids)} chunks to FAISS index (total: {self._index.ntotal}).")
        return positions

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Search the FAISS index for query.
        Returns list of (chunk_id, score) tuples.
        """
        if self._index is None:
            self.load_index()

        if self._index is None or self._index.ntotal == 0:
            logger.warning("FAISS index is empty. No results.")
            return []

        query_embedding = self.embed_texts([query])
        scores, indices = self._index.search(query_embedding, min(top_k, self._index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._chunk_ids):
                continue
            chunk_id = self._chunk_ids[idx]
            results.append((chunk_id, float(score)))

        return results

    def remove_chunks(self, chunk_ids_to_remove: List[str]):
        """
        Remove chunks from the index by rebuilding without them.
        FAISS flat index doesn't support in-place deletion.
        """
        if not chunk_ids_to_remove or self._index is None:
            return

        import faiss

        remove_set = set(chunk_ids_to_remove)
        keep_indices = [
            i for i, cid in enumerate(self._chunk_ids)
            if cid not in remove_set
        ]

        if not keep_indices:
            self._index = None
            self._chunk_ids = []
            self._save_index()
            return

        # Reconstruct embeddings for kept chunks
        all_vectors = self._index.reconstruct_n(0, self._index.ntotal)
        kept_vectors = all_vectors[keep_indices].astype(np.float32)
        kept_ids = [self._chunk_ids[i] for i in keep_indices]

        dim = kept_vectors.shape[1]
        self._index = faiss.IndexFlatIP(dim)
        self._index.add(kept_vectors)
        self._chunk_ids = kept_ids
        self._save_index()
        logger.info(f"Rebuilt FAISS index after removing {len(chunk_ids_to_remove)} chunks.")

    def _save_index(self):
        """Persist FAISS index and chunk ID list to disk."""
        import faiss
        if self._index is None:
            return
        idx_path, meta_path = self._get_paths()
        faiss.write_index(self._index, str(idx_path))
        with open(meta_path, "wb") as f:
            pickle.dump(self._chunk_ids, f)

    @property
    def total_vectors(self) -> int:
        return self._index.ntotal if self._index else 0


embedding_service = EmbeddingService()

