from app.services.confidence.confidence_service import confidence_scorer

def test_insufficient_evidence_confidence():
    score = confidence_scorer.compute(
        rerank_scores=[],
        llm_confidence=0.0,
        num_citations=0,
        num_conflicts=0,
        status="insufficient_evidence"
    )
    assert score == 0.0

def test_high_confidence_calculation():
    score = confidence_scorer.compute(
        rerank_scores=[4.5, 2.1, 0.5],
        llm_confidence=0.95,
        num_citations=3,
        num_conflicts=0,
        status="answered"
    )
    assert score > 0.65
    assert confidence_scorer.classify(score, "answered") == "high"

def test_conflict_penalty():
    score_no_conflict = confidence_scorer.compute(
        rerank_scores=[3.0],
        llm_confidence=0.8,
        num_citations=2,
        num_conflicts=0,
        status="answered"
    )
    score_with_conflict = confidence_scorer.compute(
        rerank_scores=[3.0],
        llm_confidence=0.8,
        num_citations=2,
        num_conflicts=2,
        status="answered"
    )
    assert score_with_conflict < score_no_conflict

