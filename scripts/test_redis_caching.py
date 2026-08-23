import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.graph import ask

print("\n" + "=" * 70)
print("🚀 TESTING UPSTASH SERVERLESS REDIS CACHING")
print("=" * 70)

test_query = "What is Dilip specializing in?"

# First execution (Cache Miss -> Generates Fresh & Saves to Redis)
print(f"\n1️⃣ EXECUTION 1 (Fresh Query against GraphRAG): \"{test_query}\"")
t0 = time.perf_counter()
res1 = ask(test_query)
elapsed1 = time.perf_counter() - t0
print(f"   ⏱️ Latency: {elapsed1:.2f} seconds")
print(f"   ✨ Provider: {res1.get('provider_used')}")
print(f"   📦 Sources: {len(res1.get('sources', []))}")

# Second execution (Cache Hit -> Returns directly from Upstash Redis)
print(f"\n2️⃣ EXECUTION 2 (Repeated Query -> Upstash Redis Lookup): \"{test_query}\"")
t1 = time.perf_counter()
res2 = ask(test_query)
elapsed2 = time.perf_counter() - t1
print(f"   ⚡ Latency: {elapsed2:.4f} seconds ({elapsed2 * 1000:.1f} ms) 🚀")
print(f"   ✨ Provider: {res2.get('provider_used')}")
print(f"   💾 Cached Flag: {res2.get('cached')}")
print(f"   📦 Sources: {len(res2.get('sources', []))}")

print(f"\n📝 CACHED ANSWER PREVIEW:\n{res2.get('answer')[:250]}...")
print("=" * 70 + "\n")
