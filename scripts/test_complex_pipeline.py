import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.graph import ask

print("\n" + "=" * 80)
print("🚀 ENTERPRISE HYBRID GRAPHRAG PIPELINE TRACE (COMPLEX MULTI-HOP QUERY)")
print("=" * 80 + "\n")

complex_query = (
    "Compare Samsung's top revenue-generating 5G models in Europe against "
    "Apple's flagship smartphone pricing and highest warranty repair claims."
)

print(f"📌 COMPLEX TEST QUERY:")
print(f"   \"{complex_query}\"\n")

t0 = time.perf_counter()
response = ask(complex_query)
total_elapsed = time.perf_counter() - t0

timings = response.get("timings", {})
sources = response.get("sources", [])
graph_sources = [s for s in sources if s.get("source_type") == "neo4j_graph" or s.get("is_graph")]
vector_sources = [s for s in sources if s.get("source_type") != "neo4j_graph" and not s.get("is_graph")]

print("=" * 80)
print("⚡ PIPELINE STEP-BY-STEP WATERFALL LATENCY BREAKDOWN")
print("=" * 80)
print(f"1. 🎯 Router Node (Intent Classification)    : {timings.get('router_ms', 0):>7.1f} ms  [Engine: Groq LPU]")
print(f"2. 🧩 Decomposer Node (Multi-Hop Splitting) : {timings.get('decomposer_ms', 0):>7.1f} ms  [Engine: Groq LPU]")
print(f"3. 🔍 Parallel Hybrid Retriever             : {timings.get('retriever_ms', 0):>7.1f} ms  [NVIDIA NIM + Pinecone + Neo4j AuraDB]")
print(f"4. ⚖️ Document Grader Node                  : {timings.get('grader_ms', 0):>7.1f} ms  [Relevance Filtering]")
print(f"5. ✍️ LLM Synthesizer (Answer Generation)   : {timings.get('synthesizer_ms', 0):>7.1f} ms  [Engine: {response.get('provider_used', 'groq').upper()}]")
print(f"{'-' * 80}")
print(f"⏱️ TOTAL PIPELINE END-TO-END LATENCY        : {total_elapsed:>7.2f} seconds")
print("=" * 80)

print(f"\n📦 RETRIEVAL PROVENANCE:")
print(f"   • Total Context Items Retained : {len(sources)}")
print(f"   • Neo4j Knowledge Graph Facts  : {len(graph_sources)} structured facts")
for g in graph_sources[:3]:
    print(f"     - [Neo4j] {g.get('doc_id')}: {g.get('chunk_text', '')[:90]}...")
print(f"   • Pinecone Dense Vector Chunks : {len(vector_sources)} chunks")
for v in vector_sources[:3]:
    print(f"     - [Vector] {v.get('doc_id')}: {v.get('chunk_text', '')[:90]}...")

print(f"\n📝 FINAL GENERATED ANSWER:")
print("-" * 80)
print(response.get("answer", ""))
print("-" * 80)

if response.get("suggestions"):
    print("\n💡 SUGGESTED FOLLOW-UPS:")
    for sug in response.get("suggestions", []):
        print(f"   👉 {sug}")
print("=" * 80 + "\n")
