"""
scripts/test_with_questions.py
──────────────────────────────
Tests the RAG pipeline with questions directly from the parquet test set.
Compares the model's generated answer, intent classification, and citations
against the reference gold answer.
"""

import os
import sys
import json
import time
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(".env")

from app.agent.graph import ask
from pinecone import Pinecone

def run_test():
    print("=" * 80)
    print("           ENTERPRISE RAG - TEST SUITE WITH PARQUET QUESTIONS")
    print("=" * 80)

    # 1. Load questions from parquet
    parquet_path = r"Dataset/questins/test (1).parquet"
    print(f"\n[1] Loading questions from: {parquet_path}")
    df_questions = pd.read_parquet(parquet_path)
    print(f"    Total questions available in dataset: {len(df_questions):,}")

    # 2. Check Pinecone status
    pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
    index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "enterprise-rag-demo"))
    stats = index.describe_index_stats()
    total_vectors = stats.total_vector_count
    print(f"    Current vectors in Pinecone index: {total_vectors:,}")

    # 3. Select a diverse set of test questions
    # Pick 5 questions from different sources / types
    sample_indices = [0, 1, 3, 5, 8]
    selected_questions = df_questions.iloc[sample_indices]

    results = []

    print("\n" + "=" * 80)
    print("                      RUNNING LIVE PIPELINE TESTS")
    print("=" * 80)

    for i, (idx, row) in enumerate(selected_questions.iterrows(), 1):
        qid = row["question_id"]
        qtype = row["question_type"]
        sources = str(row["source_types"])
        question = row["question"]
        expected_docs = row["expected_doc_ids"]
        gold_answer = str(row["gold_answer"])

        print(f"\n[{i}/5] TEST CASE: {qid} (Type: {qtype})")
        print(f"  Question: {question}")
        print(f"  Expected Doc IDs: {expected_docs}")

        t0 = time.time()
        try:
            response = ask(question)
            elapsed = time.time() - t0

            answer = response.get("answer", "")
            intent = response.get("intent", "unknown")
            retrieved_sources = response.get("sources", [])
            retrieved_ids = [s.get("doc_id") for s in retrieved_sources if s.get("doc_id")]

            print(f"\n  >> Pipeline Result ({elapsed:.2f}s):")
            print(f"     Intent Classified : {intent}")
            print(f"     Retrieved Sources : {len(retrieved_sources)} chunks (Doc IDs: {retrieved_ids})")
            print(f"\n  >> MODEL ANSWER:")
            print(f"     {answer.strip()}")
            print(f"\n  >> GOLD REFERENCE:")
            print(f"     {gold_answer.strip()[:300]}...")

            results.append({
                "question_id": qid,
                "question_type": qtype,
                "question": question,
                "intent": intent,
                "model_answer": answer,
                "gold_answer": gold_answer,
                "retrieved_doc_ids": retrieved_ids,
                "latency_seconds": round(elapsed, 2)
            })

        except Exception as e:
            print(f"  [ERROR] Running question {qid}: {e}")

        print("-" * 80)

    # Summary
    print("\n" + "=" * 80)
    print("                            TEST SUMMARY")
    print("=" * 80)
    print(f"Total Questions Tested : {len(results)}")
    avg_latency = sum(r['latency_seconds'] for r in results) / max(len(results), 1)
    print(f"Average Latency        : {avg_latency:.2f}s per query")
    print("=" * 80)

if __name__ == "__main__":
    run_test()
