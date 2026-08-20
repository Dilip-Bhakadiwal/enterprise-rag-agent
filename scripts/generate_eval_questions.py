"""
Generate real eval questions from the dataset parquet.
Run once: python scripts/generate_eval_questions.py
"""
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingestion.load_dataset import load_questions

qs = load_questions()
print(f"Total questions loaded: {len(qs)}")

# Pick 15 questions with non-empty answers
selected = []
for q in qs:
    if q["ground_truth"] and len(q["ground_truth"]) > 20:
        selected.append(q)
    if len(selected) >= 15:
        break

# Build eval question format
eval_qs = []
for i, q in enumerate(selected, 1):
    src = q.get("source_types", "")
    if isinstance(src, list):
        src_list = src
    elif isinstance(src, str) and src:
        src_list = [s.strip() for s in src.split(",")]
    else:
        src_list = []

    eval_qs.append({
        "id": f"q{i:03d}",
        "intent": q.get("question_type", "basic"),
        "question": q["question"],
        "ground_truth": q["ground_truth"],
        "expected_source_types": src_list,
        "expected_doc_ids": q.get("source_doc_id", ""),
        "notes": "Auto-generated from EnterpriseRAG-Bench dataset",
    })

out_path = Path("eval/test_questions.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(eval_qs, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(eval_qs)} eval questions to {out_path}")
for q in eval_qs[:5]:
    print(f"  [{q['id']}] ({q['intent']}) {q['question'][:80]}")
