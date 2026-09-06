"""
scripts/ingest_graphrag_bench_to_pinecone.py
─────────────────────────────────────────────
High-Performance Pinecone Vector Ingestion for GraphRAG-Bench:
  1. Wipes obsolete vectors from the index.
  2. Parses & chunks Medical corpus and Novel literature books.
  3. Includes portfolio AI systems benchmarks.
  4. Embeds via NVIDIA NIM (1024-dim) in safe, paced batches.
  5. Upserts into Pinecone and verifies index stats.

Usage:
    C:\\Users\\EXNOX\\Desktop\\project\\venv\\Scripts\\python.exe scripts/ingest_graphrag_bench_to_pinecone.py
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pinecone import Pinecone, ServerlessSpec
from app.config import settings

DATASET_DIR = PROJECT_ROOT / "dataset"
CORPUS_DIR = DATASET_DIR / "corpus"
QUESTIONS_DIR = DATASET_DIR / "questions"

INDEX_NAME = settings.pinecone_index_name
EMBED_MODEL = settings.nvidia_embedding_model
EMBED_DIM = 1024


def get_pinecone_index(pc: Pinecone):
    """Ensure Pinecone index exists and return handle."""
    existing = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing:
        print(f"✨ Creating Pinecone Index '{INDEX_NAME}' (dim={EMBED_DIM})...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
        )
        while not pc.describe_index(INDEX_NAME).status["ready"]:
            time.sleep(2)
    return pc.Index(INDEX_NAME)


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed batch of texts using OpenRouter openai/text-embedding-3-small (1024 dimensions)."""
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": texts,
        "model": "openai/text-embedding-3-small",
        "dimensions": 1024,
    }

    for attempt in range(5):
        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()["data"]
                    return [item["embedding"] for item in data]
                elif resp.status_code == 429:
                    print(f"  ⏳ Rate limited (429), waiting 3s (attempt {attempt+1}/5)...")
                    time.sleep(3)
                else:
                    print(f"  ⚠️ OpenRouter returned HTTP {resp.status_code}: {resp.text}")
                    time.sleep(2)
        except Exception as exc:
            print(f"  ⚠️ Error embedding batch: {exc}")
            time.sleep(2)

    raise RuntimeError("Failed to embed batch from OpenRouter after 5 attempts.")


def build_graphrag_bench_chunks() -> list[dict]:
    """Generate dense, highly representative text chunks from Medical & Novel datasets."""
    chunks = []
    print("\n📚 Generating semantic chunks from GraphRAG-Bench...")

    # 1. Medical Clinical Corpus
    med_path = CORPUS_DIR / "medical.json"
    if med_path.exists():
        med_data = json.loads(med_path.read_text(encoding="utf-8"))
        for item in med_data:
            corpus_name = item.get("corpus_name", "Medical")
            ctx = item.get("context", "")
            print("  • Chunking Medical Corpus into 1,200-char semantic windows...")
            step = 1200
            window_size = 1400
            for pos in range(0, min(len(ctx), 80000), step):
                para = ctx[pos : pos + window_size].strip()
                if len(para) > 120:
                    p_lower = para.lower()
                    topic = "Clinical Medicine"
                    if "basal cell" in p_lower or "bcc" in p_lower:
                        topic = "Basal Cell Carcinoma (BCC)"
                    elif "squamous cell" in p_lower or "cscc" in p_lower:
                        topic = "Squamous Cell Carcinoma (CSCC)"
                    elif "adrenal" in p_lower:
                        topic = "Adrenal Tumors"
                    elif "melanoma" in p_lower:
                        topic = "Melanoma"
                    elif "biopsy" in p_lower or "testing" in p_lower:
                        topic = "Diagnostic Testing"
                    elif "mohs" in p_lower or "surgery" in p_lower:
                        topic = "Surgical Procedures"

                    idx = pos // step
                    clean_chunk = (
                        f"Domain: Clinical Healthcare & Oncology\n"
                        f"Topic: {topic}\n"
                        f"Source: NCCN Patient Guidelines ({corpus_name}, Section {idx+1})\n\n"
                        f"{para}"
                    )
                    chunks.append({
                        "id": f"med_chunk_{idx:03d}",
                        "text": clean_chunk,
                        "metadata": {
                            "title": f"Medical: {topic} (Section {idx+1})",
                            "domain": "Medical",
                            "source_type": "medical_corpus",
                            "topic": topic,
                            "doc_id": f"med_chunk_{idx:03d}",
                            "chunk_text": clean_chunk,
                        }
                    })

    # 2. Literature Novel Corpus & Passages
    nov_path = CORPUS_DIR / "novel.json"
    if nov_path.exists():
        nov_data = json.loads(nov_path.read_text(encoding="utf-8"))
        print(f"  • Chunking Novel Literature Corpus ({len(nov_data)} classic works)...")
        for b_idx, book in enumerate(nov_data):
            b_name = book.get("corpus_name", f"Novel-{b_idx}")
            ctx = book.get("context", "")
            # Take representative excerpts from each book (start, middle, end)
            stride = 2000
            book_chunks_count = 0
            for pos in range(0, min(len(ctx), 12000), stride):
                passage = ctx[pos : pos + 1200].strip()
                if len(passage) > 150:
                    clean_chunk = (
                        f"Domain: Literature & Historical Narratives\n"
                        f"Work: {b_name}\n"
                        f"Excerpt (Offset {pos:,}):\n\n"
                        f"{passage}"
                    )
                    c_id = f"nov_{b_name.lower().replace('-', '_')}_{book_chunks_count}"
                    chunks.append({
                        "id": c_id,
                        "text": clean_chunk,
                        "metadata": {
                            "title": f"Literature: {b_name} Excerpt",
                            "domain": "Literature",
                            "source_type": "novel_corpus",
                            "book": b_name,
                            "doc_id": c_id,
                            "chunk_text": clean_chunk,
                        }
                    })
                    book_chunks_count += 1

    # 3. Portfolio & AI System Chunks (Retaining portfolio context)
    portfolio_chunks = [
        {
            "id": "portfolio_focal_cbam",
            "title": "Dilip Bhakadiwal — MoES IEEE Research on Focal-CBAM Fish-YOLO",
            "domain": "AI Research",
            "text": (
                "Author: Dilip Bhakadiwal (M.Tech in Artificial Intelligence, DIAT DRDO, Pune).\n"
                "Published Paper: Focal-CBAM Fish-YOLO: Attention-Enhanced Deep Learning for Underwater Object Detection.\n"
                "Funding: Funded by the Ministry of Earth Sciences (MoES), Government of India.\n"
                "Publication Venue: IEEE Xplore.\n"
                "Technical Innovation: Dual-attention Focal-CBAM module integrated into YOLOv8 architecture for low-latency underwater perception."
            ),
        },
        {
            "id": "portfolio_nexora_rag",
            "title": "Dilip Bhakadiwal — Nexora AI Enterprise Hybrid GraphRAG Engine",
            "domain": "Enterprise Systems",
            "text": (
                "Project: Nexora AI — Enterprise Hybrid GraphRAG Engine.\n"
                "Architect: Dilip Bhakadiwal.\n"
                "Architecture: LangGraph agentic loop with dynamic query routing, multi-hop Cypher traversal on Neo4j AuraDB, "
                "dense vector semantic search on Pinecone, sub-150ms Upstash Redis semantic caching, and a 3-tier resilient failover ladder (Groq -> OpenRouter -> NVIDIA NIM)."
            ),
        },
    ]
    for p in portfolio_chunks:
        chunks.append({
            "id": p["id"],
            "text": p["text"],
            "metadata": {
                "title": p["title"],
                "domain": p["domain"],
                "source_type": "portfolio_document",
                "doc_id": p["id"],
                "chunk_text": p["text"],
            }
        })

    print(f"✨ Total Generated Knowledge Chunks: {len(chunks)}")
    return chunks


def run_pipeline():
    print("=" * 80)
    print("🌲 NEXORA AI — PINECONE VECTOR INGESTION (GraphRAG-Bench)")
    print(f"   Target Index: {INDEX_NAME} | Model: {EMBED_MODEL}")
    print("=" * 80)

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = get_pinecone_index(pc)

    # 1. Clean existing vectors
    print("\n🧹 [1/3] Wiping obsolete vectors in Pinecone index...")
    try:
        index.delete(delete_all=True)
        print("  ✅ Default namespace cleared.")
    except Exception as e:
        print(f"  ℹ️ Notice on delete_all: {e}")

    try:
        index.delete(delete_all=True, namespace="alignai")
        print("  ✅ 'alignai' namespace cleared.")
    except Exception as e:
        pass

    # 2. Build Chunks
    chunks = build_graphrag_bench_chunks()

    # 3. Batch Embed and Upsert
    print(f"\n⚡ [2/3] Embedding & Upserting {len(chunks)} chunks...")
    batch_size = 20
    total_chunks = len(chunks)
    upserted = 0

    t0 = time.time()
    for i in range(0, total_chunks, batch_size):
        batch = chunks[i : i + batch_size]
        texts = [c["text"] for c in batch]

        print(f"  • Batch {i // batch_size + 1}/{(total_chunks + batch_size - 1) // batch_size} ({len(batch)} chunks)...", end="\r")
        embeddings = embed_batch(texts)

        vectors = []
        for c, emb in zip(batch, embeddings):
            vectors.append({
                "id": c["id"],
                "values": emb,
                "metadata": c["metadata"],
            })

        index.upsert(vectors=vectors)
        upserted += len(vectors)
        time.sleep(0.4)

    print(f"\n  ✅ Successfully upserted {upserted}/{total_chunks} vectors!")

    # 4. Verification
    print("\n📊 [3/3] Verifying Pinecone Index Statistics...")
    time.sleep(2)
    stats = index.describe_index_stats()
    print(f"  • Total Vectors in Index: {stats.total_vector_count}")
    print(f"  • Dimension             : {stats.dimension}")
    print("=" * 80)
    print(f"🎉 Pinecone Ingestion Finished in {time.time() - t0:.2f} seconds!")


if __name__ == "__main__":
    run_pipeline()
