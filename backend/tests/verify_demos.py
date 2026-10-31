"""
Verification of 5 Evidence-Backed Demonstration Examples.
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.retrieval.hybrid_retriever import hybrid_retriever
from app.services.reranking.reranker import reranker_service
from app.services.generation.answer_generator import answer_service
from app.services.conflicts.conflict_detector import conflict_detector
from app.core.database import AsyncSessionLocal, init_db

DEMO_QUESTIONS = [
    {
        "type": "Direct Factual Answer",
        "question": "How many annual leave days are full-time employees entitled to?",
    },
    {
        "type": "Paraphrased Query",
        "question": "How do I request VPN access?",
    },
    {
        "type": "Contradictory Policies Across Versions",
        "question": "How often must passwords be changed?",
    },
    {
        "type": "Team-Specific Variation",
        "question": "How many days per week can Engineering employees work remotely?",
    },
    {
        "type": "Unsupported Query (Fallback Behavior)",
        "question": "How do I request a refund for cryptocurrency purchases?",
    },
]

async def run_demos():
    await init_db()
    print("=" * 70)
    print("5 EVIDENCE-BACKED DEMONSTRATION EXAMPLES VERIFICATION")
    print("=" * 70)

    async with AsyncSessionLocal() as db:
        for idx, item in enumerate(DEMO_QUESTIONS, 1):
            qtype = item["type"]
            question = item["question"]
            print(f"\n--- Demo {idx}: {qtype} ---")
            print(f"Question: {question}")

            res = await hybrid_retriever.retrieve(question, top_k=6, db=db)
            chunks = res["chunk_records"]
            reranked = reranker_service.rerank(question, chunks, top_k=3)
            r_chunks = [c for c, _ in reranked]
            r_scores = [s for _, s in reranked]
            chunk_ids = [c.id for c in r_chunks]

            conflicts = conflict_detector.detect_conflicts(r_chunks)
            gen = answer_service.generate_answer(question, r_chunks, r_scores, chunk_ids)

            print(f"Status: {gen.get('status')}")
            print(f"Confidence: {gen.get('confidence')}")
            print(f"Detected Conflicts: {len(conflicts)}")
            if conflicts:
                for c in conflicts:
                    print(f"  * Conflict in topic: '{c.get('topic')}' between {c.get('document_a')} and {c.get('document_b')}")

            citations = gen.get("citations", [])
            print(f"Citations ({len(citations)}):")
            for cit in citations:
                doc = cit.get("source_document")
                sec = cit.get("section_title")
                pg = cit.get("page_number")
                ver = cit.get("document_version")
                excerpt = cit.get("excerpt")
                print(f"  [{cit.get('citation_id')}] Doc: {doc} | Section: {sec} | Page: {pg} | Version: {ver}")
                print(f"      Excerpt: \"{excerpt[:120]}...\"")

            print("Answer Excerpt:")
            print(" ", gen.get("answer")[:350].replace("\n", "\n  "))

if __name__ == "__main__":
    asyncio.run(run_demos())
