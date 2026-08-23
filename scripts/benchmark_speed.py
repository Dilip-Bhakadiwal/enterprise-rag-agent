import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.graph import ask

print("=" * 60)
print("🚀 RUNNING END-TO-END LATENCY BENCHMARK WITH GROQ LPU")
print("=" * 60)

query = "Which Apple audio products recorded the highest warranty repair claims and what were their prices?"
t0 = time.perf_counter()
res = ask(query)
total_s = time.perf_counter() - t0

print(f"\n⚡ TOTAL LATENCY: {total_s:.2f} seconds")
print(f"✨ PROVIDER USED: {res.get('provider_used')}")
print(f"⏱️ PER-NODE TIMINGS (ms):")
for node, ms in res.get("timings", {}).items():
    print(f"   • {node}: {ms}ms")
print(f"📊 SOURCES RETRIEVED: {len(res.get('sources', []))}")
print(f"\n📝 ANSWER:\n{res.get('answer')}")
print("=" * 60)
