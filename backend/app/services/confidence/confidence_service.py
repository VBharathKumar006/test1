"""
Multi-signal confidence scoring service.
Avoids relying solely on LLM self-reported confidence.
"""
import logging
from typing import List, Any, Dict

logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """
    Scores answer confidence using multiple signals:
    1. Top retrieval relevance score
    2. Score gap between top-1 and top-2 (distribution sharpness)
    3. Number of supporting passages with high relevance
    4. Conflict severity
    5. Citation coverage
    """

    def compute(
        self,
        rerank_scores: List[float],
        llm_confidence: float,
        num_citations: int,
        num_conflicts: int,
        status: str,
    ) -> float:
        """Return a composite confidence score in [0, 1]."""

        # Status-based floor/ceiling
        if status == "insufficient_evidence":
            return 0.0
        if status == "error":
            return 0.0

        score = 0.0

        # Signal 1: Top retrieval score (weight 0.3)
        if rerank_scores:
            top_score = max(rerank_scores)
            # Normalize to [0,1] — rerank scores are logits, normalize with sigmoid
            normalized_top = self._sigmoid(top_score)
            score += 0.30 * normalized_top

        # Signal 2: Score distribution sharpness (weight 0.15)
        if len(rerank_scores) >= 2:
            sorted_scores = sorted(rerank_scores, reverse=True)
            gap = sorted_scores[0] - sorted_scores[1]
            gap_score = min(gap / 5.0, 1.0)  # gap > 5 → max score
            score += 0.15 * gap_score

        # Signal 3: LLM self-reported confidence (weight 0.25, discounted)
        llm_capped = min(max(llm_confidence, 0.0), 1.0) * 0.8  # apply skepticism discount
        score += 0.25 * llm_capped

        # Signal 4: Citation coverage (weight 0.20)
        citation_score = min(num_citations / 3.0, 1.0)  # 3+ citations → max
        score += 0.20 * citation_score

        # Signal 5: Conflict penalty (weight 0.10)
        conflict_penalty = min(num_conflicts * 0.3, 1.0)
        score += 0.10 * (1.0 - conflict_penalty)

        return round(min(max(score, 0.0), 1.0), 3)

    def _sigmoid(self, x: float) -> float:
        import math
        try:
            return 1.0 / (1.0 + math.exp(-x))
        except OverflowError:
            return 0.0 if x < 0 else 1.0

    def classify(self, confidence: float, status: str) -> str:
        """Classify confidence into human-readable level."""
        from app.core.config import settings
        if status in ("insufficient_evidence", "error"):
            return "none"
        if confidence >= settings.CONFIDENCE_THRESHOLD:
            return "high"
        if confidence >= settings.LOW_CONFIDENCE_THRESHOLD:
            return "medium"
        return "low"


confidence_scorer = ConfidenceScorer()

