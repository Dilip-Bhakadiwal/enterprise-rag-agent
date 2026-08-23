"""
scripts/test_advanced_prompts.py
────────────────────────────────
Advanced Stress-Test Suite for Hybrid Agentic GraphRAG:
Executes 5 complex multi-hop queries across Neo4j AuraDB & Pinecone Vector DB,
displaying full retrieval provenance, Cypher facts, and synthesizer outputs.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Force UTF-8 stdout for Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from loguru import logger

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.graph import ask
from app.agent.guardrails import sanitize_pii
from app.agent.graph_retriever import retrieve_hybrid_graph_chunks

TEST_PROMPTS = [
    {
        "id": "PROMPT_1_RELATIONAL_WARRANTY",
        "title": "1. Multi-Hop Audio Products & Warranty Claims",
        "query": "Which Apple audio products recorded the highest warranty repair claims and what were their prices?",
    },
    {
        "id": "PROMPT_2_CROSS_BRAND_5G",
        "title": "2. Cross-Brand 5G Revenue vs Apple MSRP Comparison",
        "query": "Compare Samsung's top revenue-generating 5G models in Europe against Apple's flagship smartphone pricing.",
    },
    {
        "id": "PROMPT_3_EUROPEAN_RETAIL_STORES",
        "title": "3. European Flagship Store Performance (UK & France)",
        "query": "What are the top Apple retail store locations in the UK and France by product volume and revenue?",
    },
    {
        "id": "PROMPT_4_LAPTOP_VS_PHONE_REPAIRS",
        "title": "4. Reliability Analysis: MacBook Laptops vs iPhone Claims",
        "query": "How do warranty repair claims for MacBook Pro models compare against iPhone models in the knowledge graph?",
    },
    {
        "id": "PROMPT_5_PII_GUARDRAIL_STRESS",
        "title": "5. Adversarial PII Injection + Regional Sales Query",
        "query": "Contact user at sarah.connor@cyberdyne.org with token sk-live-99887766554433221100. What is the average quarterly revenue of Galaxy S23 in North America?",
    },
]


def run_test_suite():
    print("\n" + "=" * 80)
    print("🚀 RUNNING ADVANCED AGENTIC GRAPHRAG PROMPT TESTING SUITE")
    print("   Knowledge Graph: Neo4j AuraDB | Vector DB: Pinecone (NVIDIA NIM 1024-dim)")
    print("=" * 80 + "\n")

    results = []

    for item in TEST_PROMPTS:
        p_id = item["id"]
        title = item["title"]
        raw_query = item["query"]

        print(f"\n{'─' * 80}")
        print(f"📌 {title}")
        print(f"💬 Raw Query: \"{raw_query}\"")
        print(f"{'─' * 80}")

        # 1. Test PII Guardrail
        sanitized_query, pii_result = sanitize_pii(raw_query)
        if pii_result["is_masked"]:
            print(f"🛡️ PII Guardrail: Triggered! Masked {pii_result['total_masked_count']} sensitive items.")
            print(f"   Sanitized: \"{sanitized_query}\"")
        else:
            print("🛡️ PII Guardrail: Clean (No sensitive data detected)")

        # 2. Inspect Raw Hybrid Retrieval (Neo4j + Pinecone)
        chunks, used_fallback = retrieve_hybrid_graph_chunks(sanitized_query, top_k=6)
        graph_sources = [c for c in chunks if c.get("source_type") == "neo4j_graph"]
        vector_sources = [c for c in chunks if c.get("source_type") != "neo4j_graph"]

        print(f"\n📦 Hybrid Retrieval Breakdown:")
        print(f"   ├─ Neo4j Graph Facts: {len(graph_sources)}")
        for g in graph_sources:
            print(f"   │   • [{g.get('category', 'Graph')}]: {g.get('chunk_text', '')[:100]}...")
        print(f"   └─ Pinecone Vector Chunks: {len(vector_sources)}")
        for v in vector_sources:
            print(f"       • [{v.get('source_type', 'Vector')}]: {v.get('chunk_text', '')[:100]}...")

        # 3. Execute Full LangGraph Pipeline
        t0 = time.perf_counter()
        agent_resp = ask(sanitized_query)
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

        print(f"\n🤖 LangGraph Final Synthesized Answer ({agent_resp.get('provider_used')}, {elapsed_ms}ms):")
        print(agent_resp.get("answer", "No answer"))
        print(f"\n📚 Citations Count: {len(agent_resp.get('sources', []))}")

        results.append({
            "id": p_id,
            "title": title,
            "latency_ms": elapsed_ms,
            "provider": agent_resp.get("provider_used"),
            "graph_facts": len(graph_sources),
            "vector_chunks": len(vector_sources),
            "sources": len(agent_resp.get("sources", [])),
        })

    # Summary Table
    print("\n" + "=" * 80)
    print("📊 ADVANCED PROMPT TESTING SUMMARY")
    print("=" * 80)
    for r in results:
        print(f"✅ {r['title']}")
        print(f"   Neo4j Facts: {r['graph_facts']} | Pinecone Vectors: {r['vector_chunks']} | Total Sources: {r['sources']} | Latency: {r['latency_ms']}ms ({r['provider']})")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    run_test_suite()
