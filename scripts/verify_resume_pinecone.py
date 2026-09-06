import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agent.retriever import get_pinecone_index, _embed_query

idx = get_pinecone_index()
stats = idx.describe_index_stats()
print(f"Total live Pinecone vectors: {stats.total_vector_count}")

queries = [
    "What published research did Dilip work on with MoES funding?",
    "What is Dilip's M.Tech CGPA and education from DIAT Pune?",
    "What are Dilip's technical skills in LangGraph and Agentic AI?"
]

for q in queries:
    emb = _embed_query(q)
    res = idx.query(vector=emb, top_k=2, filter={"source_type": "resume"}, include_metadata=True)
    print(f"\n[Query]: {q}")
    for i, m in enumerate(res["matches"], 1):
        doc_id = m["id"]
        score = m["score"]
        snippet = m["metadata"].get("chunk_text", "")[:120].replace("\n", " ")
        print(f"  [{i}] ID: {doc_id} (Score: {score:.4f})")
        print(f"      Text: {snippet}...")
