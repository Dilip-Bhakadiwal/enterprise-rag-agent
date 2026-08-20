"""
app/ingestion/embed_and_upsert.py
──────────────────────────────────
Embeds document chunks with FastEmbed (BAAI/bge-large-en-v1.5)
and upserts them into the Pinecone serverless index.

Key design choices:
  - Uses pinecone[grpc] client for high-throughput batched upserts
  - Embeds chunks lazily via FastEmbed's generator (memory efficient)
  - Creates the index if it does not already exist
  - BGE model uses "passage: " prefix for indexed docs (already applied in chunker)
  - Progress logged every batch for long-running jobs

Run this module directly to perform a full ingestion:
    python -m app.ingestion.embed_and_upsert
"""

import os
import sys
import time
from pathlib import Path
from typing import Generator

import httpx

# Ensure CUDA and cuDNN DLL paths are loaded for GPU acceleration
_cuda_bin = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin"
_cudnn_bin = r"C:\Program Files\NVIDIA\CUDNN\v9.24\bin\12.9\x64"

for _p in [_cuda_bin, _cudnn_bin]:
    if os.path.exists(_p):
        os.environ["PATH"] = _p + ";" + os.environ.get("PATH", "")
        try:
            os.add_dll_directory(_p)
        except Exception:
            pass

from fastembed import TextEmbedding
from loguru import logger
from pinecone import Pinecone, ServerlessSpec

from app.config import settings


# ── Pinecone client (lazy singleton) ──────────────────────────────────────
_pc: Pinecone | None = None


def _get_pinecone() -> Pinecone:
    global _pc
    if _pc is None:
        _pc = Pinecone(api_key=settings.pinecone_api_key)
    return _pc


def ensure_pinecone_index() -> None:
    """
    Create the Pinecone serverless index if it does not already exist.
    Safe to call multiple times — idempotent.
    """
    pc = _get_pinecone()
    index_name = settings.pinecone_index_name
    existing = [idx.name for idx in pc.list_indexes()]

    if index_name in existing:
        logger.info(f"Pinecone index '{index_name}' already exists — skipping creation")
        return

    logger.info(
        f"Creating Pinecone serverless index '{index_name}' "
        f"({settings.pinecone_cloud}/{settings.pinecone_region}, "
        f"dim={settings.embedding_dimension}, metric=cosine)"
    )
    pc.create_index(
        name=index_name,
        dimension=settings.embedding_dimension,
        metric="cosine",
        spec=ServerlessSpec(
            cloud=settings.pinecone_cloud,
            region=settings.pinecone_region,
        ),
    )

    # Wait until the index is ready
    max_wait = 120  # seconds
    waited = 0
    while waited < max_wait:
        desc = pc.describe_index(index_name)
        if desc.status.get("ready", False):
            logger.info(f"Index '{index_name}' is ready")
            return
        logger.debug(f"Waiting for index to be ready… ({waited}s elapsed)")
        time.sleep(5)
        waited += 5

    raise TimeoutError(f"Pinecone index '{index_name}' did not become ready in {max_wait}s")


def embed_and_upsert(
    chunks: list[dict],
    batch_size: int | None = None,
    dry_run: bool = False,
) -> int:
    """
    Embed a list of chunk dicts and upsert them into Pinecone.

    Args:
        chunks:      List of chunk dicts from chunker.py (must have chunk_id, chunk_text, …)
        batch_size:  Number of vectors per Pinecone upsert call (default from settings).
        dry_run:     If True, embed but don't upsert (useful for testing).

    Returns:
        Total number of vectors successfully upserted.
    """
    batch_size = batch_size or settings.upsert_batch_size

    if not chunks:
        logger.warning("embed_and_upsert called with empty chunk list — nothing to do")
        return 0

    logger.info(
        f"Starting embedding + upsert for {len(chunks):,} chunks "
        f"(batch_size={batch_size}, dry_run={dry_run})"
    )

    # ── Initialize Model / Provider ────────────────────────────────────────
    embedding_model = None
    if settings.embedding_provider == "fastembed":
        logger.info(f"Loading FastEmbed model: {settings.embedding_model} (GPU/CUDA)")
        embedding_model = TextEmbedding(
            model_name=settings.embedding_model,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
    else:
        logger.info(f"Using NVIDIA NIM Embeddings: {settings.embedding_model}")

    # ── Get Pinecone index ─────────────────────────────────────────────────
    if not dry_run:
        pc = _get_pinecone()
        index = pc.Index(settings.pinecone_index_name)

    total_upserted = 0

    # ── Process in batches ─────────────────────────────────────────────────
    for batch_start in range(0, len(chunks), batch_size):
        batch = chunks[batch_start : batch_start + batch_size]
        texts = [c["chunk_text"] for c in batch]

        batch_num = batch_start // batch_size + 1
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        logger.info(
            f"Batch {batch_num}/{total_batches}: embedding {len(batch)} chunks on GPU..."
        )

        t_start = time.time()
        
        if settings.embedding_provider == "fastembed":
            # FastEmbed returns a generator — convert to list for this batch
            embeddings = list(embedding_model.embed(texts, batch_size=batch_size))
            embeddings = [emb.tolist() for emb in embeddings]
        else:
            # NVIDIA API Call
            response = httpx.post(
                "https://integrate.api.nvidia.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.nvidia_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "input": texts,
                    "model": settings.embedding_model,
                    "input_type": "passage",
                    "truncate": "END"
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()["data"]
            # Ensure order is maintained
            data.sort(key=lambda x: x["index"])
            embeddings = [d["embedding"] for d in data]

        t_embed = time.time()

        vectors = [
            {
                "id": chunk["chunk_id"],
                "values": emb,
                "metadata": {
                    "doc_id": chunk["doc_id"],
                    "source_type": chunk["source_type"],
                    "timestamp": chunk["timestamp"],
                    "author": chunk["author"],
                    "chunk_index": chunk["chunk_index"],
                    # Store first 1000 chars of text for context in responses
                    "chunk_text": chunk["chunk_text"][:1000],
                },
            }
            for chunk, emb in zip(batch, embeddings)
        ]

        if dry_run:
            logger.debug(f"[DRY RUN] Would upsert {len(vectors)} vectors")
            total_upserted += len(vectors)
        else:
            index.upsert(vectors=vectors)
            total_upserted += len(vectors)

        t_end = time.time()
        logger.info(
            f"Batch {batch_num}/{total_batches}: upserted {len(vectors)} vectors "
            f"in {t_end - t_start:.2f}s (embed: {t_embed - t_start:.2f}s, upsert: {t_end - t_embed:.2f}s) "
            f"| total: {total_upserted:,}/{len(chunks):,}"
        )

    logger.info(f"Ingestion complete. Total vectors upserted: {total_upserted:,}")
    return total_upserted


def get_index_stats() -> dict:
    """Return Pinecone index stats (vector count, namespaces, etc.)."""
    pc = _get_pinecone()
    index = pc.Index(settings.pinecone_index_name)
    stats = index.describe_index_stats()
    if hasattr(stats, "to_dict"):
        return stats.to_dict()
    return {"total_vector_count": getattr(stats, "total_vector_count", 0)}


# ── CLI entry point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingest documents into Pinecone")
    parser.add_argument(
        "--max-docs",
        type=int,
        default=settings.max_docs,
        help=f"Max documents to ingest (default: {settings.max_docs})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Embed but don't upsert to Pinecone",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Print Pinecone index stats and exit",
    )
    args = parser.parse_args()

    if args.stats:
        stats = get_index_stats()
        logger.info(f"Pinecone index stats: {stats}")
        sys.exit(0)

    # Import here to avoid circular deps at module level
    from app.ingestion.load_dataset import load_documents, load_questions
    from app.ingestion.chunker import chunk_documents

    # ── Load eval questions first to extract seed doc_ids ─────────────────
    logger.info("Loading eval questions to extract seed doc_ids …")
    try:
        questions = load_questions()
        seed_doc_ids = []
        for q in questions:
            for did in q.get("source_doc_id", "").split(","):
                did = did.strip()
                if did and did not in seed_doc_ids:
                    seed_doc_ids.append(did)
        logger.info(f"Found {len(seed_doc_ids)} unique seed doc_ids from questions")
    except Exception as exc:
        logger.warning(f"Could not load questions for seeding: {exc}")
        seed_doc_ids = []

    # ── Ensure Pinecone index exists ───────────────────────────────────────
    if not args.dry_run:
        ensure_pinecone_index()

    # ── Load documents (seed-first sampling) ──────────────────────────────
    docs = load_documents(max_docs=args.max_docs, seed_doc_ids=seed_doc_ids)

    # ── Chunk ──────────────────────────────────────────────────────────────
    chunks = chunk_documents(docs)

    # ── Embed + upsert ────────────────────────────────────────────────────
    total = embed_and_upsert(chunks, dry_run=args.dry_run)

    if not args.dry_run:
        logger.info("Fetching final index stats …")
        stats = get_index_stats()
        logger.info(f"Final Pinecone stats: {stats}")

    logger.info(f"Done. {total:,} vectors processed.")
