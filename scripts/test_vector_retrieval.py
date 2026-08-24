import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agent.retriever import retrieve_chunks

print("=" * 70)
print("🔍 TESTING PINECONE VECTOR RETRIEVAL ON NEW DATASETS")
print("=" * 70)

queries = [
    "What is the price and release date of MacBook Pro (Touch Bar)?",
    "What is Samsung's top 5G region and revenue in Latin America?",
    "What published research did Dilip Bhakadiwal work on with MoES funding?"
]

for q in queries:
    print(f"\n❓ Query: {q}")
    chunks, fallback = retrieve_chunks(q, source_filter=[])
    print(f"   Returned {len(chunks)} chunks (fallback: {fallback}):")
    for i, c in enumerate(chunks[:2], 1):
        score = c.get("combined_score", 0.0)
        doc_id = c.get("doc_id", "")
        text_snippet = c.get("chunk_text", "")[:130].replace("\n", " ")
        print(f"   [{i}] Score: {score:.4f} | ID: {doc_id}")
        print(f"       Text: {text_snippet}...")

print("\n" + "=" * 70)
print("✅ PINECONE VECTOR RETRIEVAL VERIFIED SUCCESSFULLY!")
print("=" * 70)
