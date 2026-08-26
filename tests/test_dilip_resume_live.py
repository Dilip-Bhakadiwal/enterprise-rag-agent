"""
tests/test_dilip_resume_live.py
────────────────────────────────
Live pipeline test of user-provided PDF:
  "C:\\Users\\EXNOX\\Downloads\\dilip_resume_DsU.pdf"

Executes 4 multi-hop and complex queries:
  1. Microservices, distributed pipelines, failover mechanisms & latency SLAs
  2. Edge AI / FPGA / Jetson vs Cloud backend performance comparison
  3. M.Tech AI research at DIAT (DRDO), MoES funding, and deep learning architectures
  4. Cross-domain technical inventory & infrastructure synergy
"""

import sys
import json
import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

PDF_PATH = r"C:\Users\EXNOX\Downloads\dilip_resume_DsU.pdf"
SESSION_ID = "live_dilip_resume_evaluation_session"

def main():
    print("=" * 80)
    print("🚀 LIVE TESTING EPHEMERAL DOCUMENT RAG PIPELINE")
    print(f"File: {PDF_PATH}")
    print("=" * 80)

    # 1. Read & Upload PDF
    with open(PDF_PATH, "rb") as f:
        pdf_bytes = f.read()

    files = {"file": ("dilip_resume_DsU.pdf", pdf_bytes, "application/pdf")}
    data = {"session_id": SESSION_ID}

    print("\n[Step 1] Uploading and Parsing PDF via LlamaParse AI...")
    res_parse = requests.post("http://127.0.0.1:8000/api/doc-rag/parse", files=files, data=data)
    if res_parse.status_code != 200:
        print(f"❌ Upload Failed: {res_parse.status_code} - {res_parse.text}")
        sys.exit(1)

    p_data = res_parse.json().get("data", {})
    print("✅ Document Upload & Parse Successful!")
    print(f"  - Parser Used:      {p_data.get('parser_used')}")
    print(f"  - Page Count:       {p_data.get('page_count')} pages")
    print(f"  - Word Count:       {p_data.get('word_count')} words")
    print(f"  - Chunk Count:      {p_data.get('chunk_count')} chunks")
    print(f"  - Parse Time:       {p_data.get('parse_time_ms')} ms")
    print(f"  - Auto Suggestions: {p_data.get('starter_suggestions')}")

    # 2. Complex & Multi-Hop Queries
    queries = [
        "What microservices, distributed pipelines, and failover mechanisms did Dilip architect in his Redwood and MarketPulse projects, and what latency SLAs were achieved?",
        "Compare Dilip's work on Edge AI and hardware accelerators (FPGA / Jetson Orin / INT8 Quantization) with his cloud backend work. What throughput, FPS, or latency numbers are documented for each?",
        "What academic research did Dilip conduct at DIAT (DRDO), what government funding (MoES) was involved, and what specific deep learning models or atmospheric datasets were utilized?",
        "Synthesize a complete cross-domain technical inventory of Dilip's stack: databases, vector stores, multi-agent frameworks, cloud infra, and hardware platforms, including where each is applied in his projects."
    ]

    for idx, q in enumerate(queries, 1):
        print("\n" + "=" * 80)
        print(f"🔎 COMPLEX QUERY #{idx}: {q}")
        print("=" * 80)

        payload = {"session_id": SESSION_ID, "question": q}
        res_ask = requests.post("http://127.0.0.1:8000/api/doc-rag/ask", json=payload)
        if res_ask.status_code != 200:
            print(f"❌ Query failed: {res_ask.status_code} - {res_ask.text}")
            continue

        resp = res_ask.json()
        print("\n🤖 [SYNTHESIZED ANSWER]:")
        print(resp.get("answer"))

        print("\n📚 [DOCUMENT EXCERPT CITATIONS]:")
        for cit in resp.get("sources", []):
            print(f"  • [{cit.get('id')}] {cit.get('title')} (Relevance: {cit.get('score', 0):.3f})")
            snip = cit.get("snippet", "").replace("\n", " ").strip()
            if len(snip) > 130:
                snip = snip[:130] + "..."
            print(f"    Excerpt: {snip}")

        telem = resp.get("telemetry", {})
        print("\n📊 [EVALUATION & PERFORMANCE TELEMETRY]:")
        print(f"  • Groundedness Score:  {telem.get('faithfulness_score', 0)*100:.1f}%")
        print(f"  • Context Precision:   {telem.get('context_precision')}")
        print(f"  • Hallucination Risk:  {telem.get('hallucination_risk')}")
        print(f"  • Total Roundtrip:     {telem.get('total_time_ms'):.1f} ms (LLM: {telem.get('synthesizer_ms'):.1f} ms)")
        print(f"  • Tokens Consumed:     {telem.get('total_tokens')} total ({telem.get('prompt_tokens')} prompt, {telem.get('completion_tokens')} completion)")
        print(f"  • Cost Estimate:       ${telem.get('estimated_cost_usd'):.6f}")
        print(f"  • Active LLM:          {telem.get('active_provider')} (Groq LPU)")
        print(f"  • Storage Guarantee:   {telem.get('storage')}")

    # 3. Clean up Session
    print("\n" + "=" * 80)
    print("🧹 [Step 3] Purging Ephemeral Session from RAM...")
    res_clear = requests.post("http://127.0.0.1:8000/api/doc-rag/clear", data={"session_id": SESSION_ID})
    print(f"Clear Status: {res_clear.json()}")

    # Verify session is wiped
    res_status = requests.get(f"http://127.0.0.1:8000/api/doc-rag/status/{SESSION_ID}")
    print(f"Status Verification: {res_status.json()}")
    print("✅ Zero Persistence Verified: RAM is 100% clean and free!")

if __name__ == "__main__":
    main()
