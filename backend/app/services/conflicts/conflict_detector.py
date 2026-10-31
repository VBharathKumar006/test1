"""
Contradiction and version conflict detection service.
Identifies conflicting policies across documents using heuristics + LLM.
"""
import json
import logging
import re
from typing import List, Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

CONFLICT_DETECTION_PROMPT = """You are a document conflict analyzer for enterprise policies.

Given two policy passages from different documents, determine if they contain conflicting information.

Passage A:
Document: {doc_a}
Version: {version_a}
Effective Date: {date_a}
Department/Team: {dept_a}
Content: {text_a}

Passage B:
Document: {doc_b}
Version: {version_b}
Effective Date: {date_b}
Department/Team: {dept_b}
Content: {text_b}

Analyze whether these passages conflict. Consider:
- Direct contradictions (same topic, different values/rules)
- Version conflicts (older vs newer policy)
- Date-based conflicts (different effective dates)
- Scope differences (different departments/teams — these may be intentional variations, NOT real conflicts)

Respond with JSON only:
{{
  "has_conflict": true or false,
  "conflict_type": "direct | version | date | team | department | scope | none",
  "topic": "brief topic description or null",
  "explanation": "concise explanation of the conflict or why there is none",
  "severity": "low | medium | high",
  "is_intentional_variation": true or false
}}"""


class ConflictDetector:
    """
    Detects conflicts between retrieved document chunks.
    Phase 1: Keyword overlap heuristic to identify same-topic pairs.
    Phase 2: LLM pairwise comparison for semantic conflict detection.
    """

    # Policy-sensitive keywords that trigger conflict analysis
    POLICY_KEYWORDS = [
        "must", "shall", "required", "mandatory", "policy", "rule",
        "days", "hours", "limit", "maximum", "minimum", "allowed",
        "approved", "prohibited", "restricted", "deadline", "period",
        "password", "leave", "vacation", "reimbursement", "access",
        "days per week", "remote", "travel", "budget",
    ]

    def detect_conflicts(
        self,
        chunks: List[Any],
    ) -> List[Dict]:
        """
        Scan retrieved chunks for pairwise conflicts.
        Returns list of conflict dicts.
        """
        if len(chunks) < 2:
            return []

        # Find candidate pairs by keyword overlap
        pairs = self._find_candidate_pairs(chunks)

        conflicts = []
        for chunk_a, chunk_b in pairs:
            # Skip same document
            if chunk_a.document_id == chunk_b.document_id:
                continue

            conflict = self._analyze_pair(chunk_a, chunk_b)
            if conflict and conflict.get("has_conflict"):
                conflicts.append({
                    "conflict_id": f"conf_{chunk_a.id[:8]}_{chunk_b.id[:8]}",
                    "conflict_type": conflict.get("conflict_type", "direct"),
                    "topic": conflict.get("topic"),
                    "document_a": chunk_a.source_filename or chunk_a.document_id,
                    "document_b": chunk_b.source_filename or chunk_b.document_id,
                    "version_a": chunk_a.document_version,
                    "version_b": chunk_b.document_version,
                    "effective_date_a": chunk_a.effective_date,
                    "effective_date_b": chunk_b.effective_date,
                    "department_a": chunk_a.department,
                    "department_b": chunk_b.department,
                    "team_a": chunk_a.team,
                    "team_b": chunk_b.team,
                    "statement_a": chunk_a.original_text[:500],
                    "statement_b": chunk_b.original_text[:500],
                    "severity": conflict.get("severity", "medium"),
                    "resolution_status": "unresolved",
                    "explanation": conflict.get("explanation"),
                    "is_intentional_variation": conflict.get("is_intentional_variation", False),
                })

        return conflicts

    def _find_candidate_pairs(self, chunks: List[Any]) -> List[Tuple[Any, Any]]:
        """
        Use keyword overlap to identify chunk pairs likely discussing same topic.
        """
        pairs = []
        n = len(chunks)

        # Precompute keyword sets
        keyword_sets = []
        for chunk in chunks:
            text_lower = chunk.original_text.lower()
            kw_set = {kw for kw in self.POLICY_KEYWORDS if kw in text_lower}
            keyword_sets.append(kw_set)

        # Check all pairs for sufficient keyword overlap
        for i in range(n):
            for j in range(i + 1, n):
                if chunks[i].document_id == chunks[j].document_id:
                    continue
                overlap = keyword_sets[i] & keyword_sets[j]
                if len(overlap) >= 2:  # At least 2 shared policy keywords
                    pairs.append((chunks[i], chunks[j]))

        return pairs

    def _analyze_pair(self, chunk_a: Any, chunk_b: Any) -> Optional[Dict]:
        """Use LLM to analyze a pair of chunks for conflict."""
        from app.services.generation.llm_service import llm_service

        if not llm_service.is_available():
            return self._heuristic_conflict_check(chunk_a, chunk_b)

        prompt = CONFLICT_DETECTION_PROMPT.format(
            doc_a=chunk_a.source_filename or "Unknown",
            version_a=chunk_a.document_version or "Unknown",
            date_a=chunk_a.effective_date or "Unknown",
            dept_a=f"{chunk_a.department or ''}/{chunk_a.team or ''}".strip("/"),
            text_a=chunk_a.original_text[:600],
            doc_b=chunk_b.source_filename or "Unknown",
            version_b=chunk_b.document_version or "Unknown",
            date_b=chunk_b.effective_date or "Unknown",
            dept_b=f"{chunk_b.department or ''}/{chunk_b.team or ''}".strip("/"),
            text_b=chunk_b.original_text[:600],
        )

        try:
            raw = llm_service.generate(
                system_prompt="You are a precise document conflict analyzer. Respond with valid JSON only.",
                user_prompt=prompt,
                temperature=0.0,
                max_tokens=512,
            )
            raw = raw.strip()
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Conflict LLM analysis failed: {e}")
            return self._heuristic_conflict_check(chunk_a, chunk_b)

    def _heuristic_conflict_check(self, chunk_a: Any, chunk_b: Any) -> Dict:
        """Simple numeric value comparison when LLM unavailable."""
        # Extract numbers from both texts
        nums_a = set(re.findall(r'\b\d+\b', chunk_a.original_text))
        nums_b = set(re.findall(r'\b\d+\b', chunk_b.original_text))

        has_conflict = bool(nums_a and nums_b and nums_a != nums_b)
        conflict_type = "version" if (chunk_a.document_version and chunk_b.document_version
                                      and chunk_a.document_version != chunk_b.document_version) else "direct"

        return {
            "has_conflict": has_conflict,
            "conflict_type": conflict_type,
            "topic": None,
            "explanation": "Heuristic conflict detected based on differing numeric values.",
            "severity": "medium",
            "is_intentional_variation": False,
        }


conflict_detector = ConflictDetector()

