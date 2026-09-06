import time
import requests

URL = "http://127.0.0.1:8000/ask"
PAYLOAD = {
    "question": "What published research did Dilip work on with MoES funding?",
    "chat_history": [
        {"role": "user", "content": "Tell me about Dilip's work."},
        {"role": "assistant", "content": "Dilip is an AI Engineer."}
    ]
}

print("=== RUN 1: Fresh Query (or Caching Live GraphRAG) ===")
t0 = time.time()
try:
    res1 = requests.post(URL, json=PAYLOAD, timeout=60)
    t1 = time.time()
    data1 = res1.json()
    print(f"Total Request Time: {t1 - t0:.2f}s")
    print("Status Code:", res1.status_code)
    print("Answer snippet:", str(data1.get("answer", ""))[:120], "...")
    print("Provider:", data1.get("provider_used"))
    telem = data1.get("telemetry", {}) or {}
    print("Cached:", telem.get("cached", False))
    print("Reported Response Time:", data1.get("response_time_ms"), "ms")
except Exception as e:
    print("Error:", e)

print("\n=== RUN 2: Repeated Query (Expected: Instant Upstash Redis Cache Hit) ===")
t2 = time.time()
try:
    res2 = requests.post(URL, json=PAYLOAD, timeout=60)
    t3 = time.time()
    data2 = res2.json()
    print(f"Total Request Time: {t3 - t2:.2f}s")
    print("Status Code:", res2.status_code)
    print("Answer snippet:", str(data2.get("answer", ""))[:120], "...")
    print("Provider:", data2.get("provider_used"))
    telem2 = data2.get("telemetry", {}) or {}
    print("Cached:", telem2.get("cached", False))
    print("Cache Latency:", telem2.get("cache_latency_ms", "N/A"), "ms")
    print("Reported Response Time:", data2.get("response_time_ms"), "ms")
except Exception as e:
    print("Error:", e)

