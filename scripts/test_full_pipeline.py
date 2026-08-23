import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.graph import ask

TEST_CASES = [
    {
        "name": "TEST 1: Conversational Small-Talk (Router Fast Path)",
        "query": "hello, who are you?",
    },
    {
        "name": "TEST 2: Knowledge Graph Cypher Analytics (Apple Warranty Claims)",
        "query": "Which Apple products recorded the highest warranty repair claims and what were their prices?",
    },
    {
        "name": "TEST 3: Multi-Hop Cross-Brand 5G Comparison (Europe Market)",
        "query": "Compare Samsung 5G revenue in Europe against Apple retail store volume.",
    },
    {
        "name": "TEST 4: Portfolio Vector Retrieval (Dilip IEEE Research)",
        "query": "What published research did Dilip work on with MoES funding?",
    },
    {
        "name": "TEST 5: Upstash Redis Instant Cache Verification (Repeating Test 2)",
        "query": "Which Apple products recorded the highest warranty repair claims and what were their prices?",
    },
]

def run_pipeline_tests():
    print("\n" + "=" * 80)
    print("🚀 COMPREHENSIVE END-TO-END HYBRID GRAPHRAG PIPELINE VERIFICATION")
    print("   Groq LPU (Primary) | OpenRouter (Failover) | Neo4j AuraDB | Pinecone | Upstash Redis")
    print("=" * 80 + "\n")

    summary_results = []

    for idx, tc in enumerate(TEST_CASES, start=1):
        name = tc["name"]
        query = tc["query"]

        print(f"\n{'─' * 80}")
        print(f"📌 {name}")
        print(f"💬 Query: \"{query}\"")
        print(f"{'─' * 80}")

        t0 = time.perf_counter()
        res = ask(query)
        elapsed = time.perf_counter() - t0

        is_cached = bool(res.get("cached"))
        provider = res.get("provider_used", "unknown")
        sources_count = len(res.get("sources", []))
        answer_preview = res.get("answer", "")[:180].replace("\n", " ")

        print(f"   ⏱️ End-to-End Latency : {elapsed:.3f} seconds ({elapsed*1000:.1f}ms)")
        print(f"   ✨ Provider Engine    : {provider}")
        print(f"   💾 Upstash Redis Cache: {'⚡ HIT' if is_cached else 'Fresh Computation (Saved to Cache)'}")
        print(f"   📦 Sources Retrieved  : {sources_count} context items")
        print(f"   📝 Answer Preview     : {answer_preview}...")

        summary_results.append({
            "step": idx,
            "name": name,
            "latency": f"{elapsed:.2f}s" if elapsed >= 1.0 else f"{elapsed*1000:.0f}ms",
            "cached": is_cached,
            "provider": provider,
            "sources": sources_count,
        })

    print("\n" + "=" * 80)
    print("📊 PIPELINE VERIFICATION SUMMARY TABLE")
    print("=" * 80)
    print(f"{'#':<3} | {'Test Scenario':<45} | {'Latency':<9} | {'Cache':<8} | {'Provider':<10} | {'Sources':<7}")
    print("-" * 90)
    for r in summary_results:
        cache_str = "⚡ HIT" if r["cached"] else "MISS"
        print(f"{r['step']:<3} | {r['name'][:45]:<45} | {r['latency']:<9} | {cache_str:<8} | {r['provider']:<10} | {r['sources']:<7}")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_pipeline_tests()
