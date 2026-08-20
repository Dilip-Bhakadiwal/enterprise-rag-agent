"""
app/ingestion/chunker.py
────────────────────────
Splits document text into overlapping chunks using tiktoken for
accurate token counting (matching the BGE tokenizer closely).

Chunk config (from settings):
    CHUNK_SIZE    = 500 tokens  (body of each chunk)
    CHUNK_OVERLAP = 50 tokens   (overlap between successive chunks)

Each chunk dict has:
    {
        "chunk_id":    str,   # "{doc_id}__chunk_{n}"
        "doc_id":      str,
        "source_type": str,
        "timestamp":   str,
        "author":      str,
        "chunk_index": int,
        "chunk_text":  str,   # "passage: <text>" prefix for BGE
    }
"""

from __future__ import annotations

import tiktoken
from loguru import logger

from app.config import settings

# Tiktoken encoding — cl100k_base matches GPT-4 / many modern models closely
_ENCODING = tiktoken.get_encoding("cl100k_base")

# BGE prefix for passage-side embeddings (improves retrieval accuracy)
_PASSAGE_PREFIX = "passage: "


def _tokenize(text: str) -> list[int]:
    return _ENCODING.encode(text, disallowed_special=())


def _decode(tokens: list[int]) -> str:
    return _ENCODING.decode(tokens)


def chunk_document(
    doc: dict,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """
    Split a single document dict into overlapping token-level chunks.

    Args:
        doc:          Document dict with at least {"doc_id", "text", "source_type",
                      "timestamp", "author"}.
        chunk_size:   Token count per chunk body (default from settings).
        chunk_overlap: Overlap tokens between consecutive chunks (default from settings).

    Returns:
        List of chunk dicts ready for embedding and upsert.
    """
    size = chunk_size or settings.chunk_size
    overlap = chunk_overlap or settings.chunk_overlap

    text = doc.get("text", "").strip()
    if not text:
        return []

    tokens = _tokenize(text)
    total_tokens = len(tokens)

    if total_tokens == 0:
        return []

    chunks: list[dict] = []
    start = 0
    chunk_index = 0

    while start < total_tokens:
        end = min(start + size, total_tokens)
        chunk_tokens = tokens[start:end]
        chunk_text = _decode(chunk_tokens).strip()

        if chunk_text:
            chunks.append(
                {
                    "chunk_id": f"{doc['doc_id']}__chunk_{chunk_index}",
                    "doc_id": doc["doc_id"],
                    "source_type": doc.get("source_type", "unknown"),
                    "timestamp": doc.get("timestamp", ""),
                    "author": doc.get("author", ""),
                    "chunk_index": chunk_index,
                    # BGE passage prefix improves retrieval accuracy
                    "chunk_text": _PASSAGE_PREFIX + chunk_text,
                }
            )
            chunk_index += 1

        if end == total_tokens:
            break

        start += size - overlap  # slide window with overlap

    return chunks


def chunk_documents(
    docs: list[dict],
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """
    Chunk all documents in the list.

    Returns:
        Flat list of all chunk dicts across all documents.
    """
    size = chunk_size or settings.chunk_size
    overlap = chunk_overlap or settings.chunk_overlap

    all_chunks: list[dict] = []
    skipped = 0

    for doc in docs:
        doc_chunks = chunk_document(doc, chunk_size=size, chunk_overlap=overlap)
        if not doc_chunks:
            skipped += 1
            continue
        all_chunks.extend(doc_chunks)

    logger.info(
        f"Chunked {len(docs) - skipped:,} docs into {len(all_chunks):,} chunks "
        f"(skipped {skipped} empty docs). "
        f"Avg {len(all_chunks) / max(len(docs) - skipped, 1):.1f} chunks/doc"
    )
    return all_chunks
