import httpx
import time

def test_query(q: str):
    t0 = time.time()
    try:
        res = httpx.post("http://127.0.0.1:8000/ask", json={"question": q}, timeout=60.0)
        dt = (time.time() - t0) * 1000
        print(f"\n========================================================")
        print(f"QUERY: '{q}'")
        print(f"Status: {res.status_code} | Total Latency: {dt:.1f}ms")
        if res.status_code == 200:
            data = res.json()
            intent = data.get("intent")
            answer = data.get("answer", "")
            sources = data.get("sources", [])
            suggestions = data.get("suggestions", [])
            telemetry = data.get("telemetry", {})
            print(f"Intent: {intent}")
            print(f"Sources Count: {len(sources)}")
            print(f"Risk: {telemetry.get('hallucination_risk')}")
            print(f"Suggestions: {suggestions[:2]}")
            print("Answer Preview:")
            print(answer[:350])
        else:
            print(f"Error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Failed to query '{q}': {e}")

if __name__ == "__main__":
    print("Testing Smart Pipeline Improvements...")
    test_query("hello")
    test_query("how are you?")
    test_query("what is sun color ?")
    test_query("What published research did Dilip work on with MoES funding?")
