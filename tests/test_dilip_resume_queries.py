"""
tests/test_dilip_resume_queries.py
───────────────────────────────────
Test specific deep multi-hop queries on the exact projects present in dilip_resume_DsU.pdf.
"""

import sys
import requests

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SESSION_ID = "dilip_resume_deep_eval"
PDF_PATH = r"C:\Users\EXNOX\Downloads\dilip_resume_DsU.pdf"

with open(PDF_PATH, "rb") as f:
    pdf_bytes = f.read()

res_p = requests.post(
    "http://127.0.0.1:8000/api/doc-rag/parse",
    files={"file": ("dilip_resume_DsU.pdf", pdf_bytes, "application/pdf")},
    data={"session_id": SESSION_ID}
)

queries = [
    "What research papers or publications has Dilip authored, co-authored, or submitted, including conference or journal titles?",
    "Explain the real-time edge AI object detection system with FPGA and Jetson Orin: compare the frame rates (FPS), precision formats (INT8 vs FP32), and how the LLaMA 1B model is integrated.",
    "Detail the Focal-CBAM Fish-YOLO architecture: why was the attention module added and what benchmark results were recorded on the RUOD dataset?",
    "Provide a comprehensive breakdown of Dilip's academic credentials, institutions (DIAT DRDO / MBM University), GPA/marks, and graduation years."
]

for idx, q in enumerate(queries, 1):
    print("=" * 80)
    print(f"QUERY #{idx}: {q}")
    print("=" * 80)
    res = requests.post("http://127.0.0.1:8000/api/doc-rag/ask", json={"session_id": SESSION_ID, "question": q})
    d = res.json()
    print("\n[ANSWER]:\n" + d.get("answer", ""))
    print("\n[CITATIONS]:")
    for s in d.get("sources", []):
        score = s.get("score", 0)
        print(f"  • {s.get('title')} (Score: {score:.3f})")
    t = d.get("telemetry", {})
    faith = t.get("faithfulness_score", 0) * 100
    print(f"\n[TELEMETRY]: Groundedness: {faith:.1f}%, Precision: {t.get('context_precision')}, Latency: {t.get('total_time_ms', 0):.1f}ms")

# Clean
requests.post("http://127.0.0.1:8000/api/doc-rag/clear", data={"session_id": SESSION_ID})
print("\n[SESSION CLEARED]: Zero persistence in memory.")
