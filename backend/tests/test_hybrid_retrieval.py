from app.services.retrieval.hybrid_retriever import HybridRetriever

def test_rrf_fusion():
    retriever = HybridRetriever()

    # Semantic returned chunk_A first, chunk_B second
    semantic_results = [("chunk_A", 0.95), ("chunk_B", 0.85)]
    # BM25 returned chunk_B first, chunk_C second
    bm25_results = [("chunk_B", 12.5), ("chunk_C", 8.2)]

    fused = retriever.fuse_results(
        semantic_results,
        bm25_results,
        semantic_weight=0.6,
        bm25_weight=0.4,
        rrf_k=60
    )

    # chunk_B appears in both top lists, so should have high cumulative RRF score
    fused_chunk_ids = [item[0] for item in fused]
    assert "chunk_B" in fused_chunk_ids
    assert len(fused) == 3

