"""
app/agent/retriever.py
───────────────────────
Pinecone retrieval node for the LangGraph RAG pipeline.

Steps:
  1. Embed the query with FastEmbed (using "query: " prefix for BGE)
  2. Query Pinecone with optional source_type metadata filter, top_k=10
  3. If filtered query returns 0 results → retry WITHOUT filter (fallback)
  4. Re-rank the top-10 results down to top-5 using BM25-lite keyword overlap
  5. Return the top-5 chunks

The "query: " prefix is critical for BGE asymmetric retrieval — queries and
documents use different prefixes which significantly improves recall.
"""

from __future__ import annotations

import math
import os
import re
from collections import Counter
from functools import lru_cache

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

from loguru import logger
from pinecone import Pinecone

from app.config import settings
from app.cache import get_cached_embedding, set_cached_embedding

# ── BGE query prefix ───────────────────────────────────────────────────────
_QUERY_PREFIX = "query: "


@lru_cache(maxsize=1)
def _get_embedding_model():
    """Singleton FastEmbed model (loaded lazily if available)."""
    try:
        from fastembed import TextEmbedding
        model_name = settings.embedding_model
        logger.info(f"Loading FastEmbed model: {model_name}")
        return TextEmbedding(
            model_name=model_name,
            providers=["CPUExecutionProvider"]
        )
    except Exception as e:
        logger.warning(f"fastembed loading failed ({e}) — using zero vector fallback.")
        return None


@lru_cache(maxsize=1)
def _get_pinecone_index():
    """Singleton Pinecone index connection."""
    pc = Pinecone(api_key=settings.pinecone_api_key)
    return pc.Index(settings.pinecone_index_name)


get_pinecone_index = _get_pinecone_index


def _embed_query(query: str) -> list[float]:
    """Embed a single query text based on the configured provider."""
    return _embed_queries([query])[0]


def _embed_queries(queries: list[str]) -> list[list[float]]:
    """Embed multiple query texts with Upstash Redis vector caching and NVIDIA NIM batching."""
    if not queries:
        return []

    results: list[list[float] | None] = [None] * len(queries)
    missing_indices: list[int] = []
    missing_queries: list[str] = []

    # 1. Check Upstash Redis Cache for each query
    for idx, q in enumerate(queries):
        cached = get_cached_embedding(q)
        if cached:
            results[idx] = cached
        else:
            missing_indices.append(idx)
            missing_queries.append(q)

    # 2. If all were cached, return immediately!
    if not missing_queries:
        logger.debug(f"⚡ [Upstash Redis] All {len(queries)} embeddings served from cache!")
        return [r for r in results if r is not None]

    # 3. Compute missing embeddings
    new_embeddings = []
    if settings.embedding_provider == "nvidia":
        try:
            logger.info(f"Embedding batch of {len(missing_queries)} queries via NVIDIA NIM: {settings.embedding_model}")
            response = httpx.post(
                "https://integrate.api.nvidia.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.nvidia_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "input": missing_queries if len(missing_queries) > 1 else missing_queries[0],
                    "model": settings.embedding_model,
                    "input_type": "query"
                },
                timeout=1.5
            )
            response.raise_for_status()
            data = response.json().get("data", [])
            new_embeddings = [item["embedding"] for item in data]
        except Exception as e:
            logger.warning(f"⚠️ [Embedding Failover] NVIDIA NIM returned error ({e}). Using direct retrieval fallback.")
            new_embeddings = [[0.0] * 1024 for _ in missing_queries]
    else:
        # Fallback to local FastEmbed
        model = _get_embedding_model()
        if model is not None:
            try:
                prefixed = [_QUERY_PREFIX + q for q in missing_queries]
                embeddings = list(model.embed(prefixed))
                new_embeddings = []
                for e in embeddings:
                    arr = e.tolist()
                    if len(arr) < 1024:
                        arr = arr + [0.0] * (1024 - len(arr))
                    elif len(arr) > 1024:
                        arr = arr[:1024]
                    new_embeddings.append(arr)
            except Exception as emb_err:
                logger.warning(f"FastEmbed execution failed ({emb_err}) — using zero vector fallback.")
                new_embeddings = [[0.0] * 1024 for _ in missing_queries]
        else:
            new_embeddings = [[0.0] * 1024 for _ in missing_queries]

    # 4. Cache new embeddings in Upstash Redis and fill results array
    for orig_idx, q_text, emb in zip(missing_indices, missing_queries, new_embeddings):
        results[orig_idx] = emb
        set_cached_embedding(q_text, emb, ttl_seconds=86400)

    return [r for r in results if r is not None]


def _tokenize_for_bm25(text: str) -> list[str]:
    """Simple tokeniser for BM25-lite reranking."""
    return re.findall(r"\b[a-z0-9]+\b", text.lower())


def _bm25_lite_score(query_tokens: list[str], doc_text: str) -> float:
    """
    Lightweight BM25-inspired keyword overlap score.
    Used for reranking, not primary retrieval.
    """
    doc_tokens = _tokenize_for_bm25(doc_text)
    doc_freq = Counter(doc_tokens)
    doc_len = len(doc_tokens)
    avg_doc_len = 100  # approximate

    k1, b = 1.5, 0.75
    score = 0.0
    for term in set(query_tokens):
        tf = doc_freq.get(term, 0)
        if tf == 0:
            continue
        idf = math.log(1 + 1 / (tf + 0.5))
        tf_norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc_len / avg_doc_len))
        score += idf * tf_norm
    return score


def _pinecone_query(
    query_vector: list[float],
    top_k: int,
    source_filter: list[str],
) -> list[dict]:
    """
    Query Pinecone with an optional source_type filter.

    Returns:
        List of match dicts from Pinecone (with id, score, metadata).
    """
    index = _get_pinecone_index()
    filter_dict = None
    if source_filter:
        filter_dict = {"source_type": {"$in": source_filter}}

    result = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        filter=filter_dict,
    )
    return result.matches or []


def retrieve_chunks(
    query: str,
    source_filter: list[str],
) -> tuple[list[dict], bool]:
    """
    Retrieve relevant chunks from Pinecone, with automatic unfiltered fallback.

    Args:
        query:         The user's question.
        source_filter: Optional list of source_type values to filter by.

    Returns:
        (chunks, used_fallback)
        - chunks:        List of top-5 reranked chunk dicts (doc_id, source_type, …)
        - used_fallback: True if the unfiltered fallback was triggered
    """
    top_k = settings.top_k_retrieve
    top_rerank = settings.top_k_rerank

    query_vector = _embed_query(query)
    query_tokens = _tokenize_for_bm25(query)

    used_fallback = False

    # ── Attempt 1: Filtered search ─────────────────────────────────────────
    matches = _pinecone_query(query_vector, top_k, source_filter)
    logger.info(
        f"Filtered retrieval (filter={source_filter}): {len(matches)} matches"
    )

    # ── Fallback: Unfiltered search ────────────────────────────────────────
    if not matches and source_filter:
        logger.warning(
            f"Filtered query returned 0 results — retrying WITHOUT filter (fallback)"
        )
        matches = _pinecone_query(query_vector, top_k, [])
        used_fallback = True
        logger.info(f"Unfiltered fallback retrieval: {len(matches)} matches")

    if not matches:
        logger.warning("No chunks retrieved even without filter — returning empty")
        return [], used_fallback

    # ── BM25-lite reranking ─────────────────────────────────────────────────
    # Combine semantic score (Pinecone cosine) with keyword overlap
    candidates = []
    for match in matches:
        metadata = match.metadata or {}
        chunk_text = metadata.get("chunk_text") or metadata.get("text", "")
        bm25 = _bm25_lite_score(query_tokens, chunk_text)
        # Weighted combination: 80% semantic, 20% keyword
        combined_score = 0.8 * float(match.score) + 0.2 * min(bm25, 1.0)
        candidates.append(
            {
                "chunk_id": match.id,
                "doc_id": metadata.get("doc_id", match.id),
                "source_type": metadata.get("source_type", "unknown"),
                "timestamp": metadata.get("timestamp", ""),
                "author": metadata.get("author", ""),
                "chunk_text": chunk_text,
                "semantic_score": float(match.score),
                "bm25_score": bm25,
                "combined_score": combined_score,
            }
        )

    # Sort by combined score descending, take top-k
    candidates.sort(key=lambda x: x["combined_score"], reverse=True)
    top_chunks = candidates[:top_rerank]

    logger.info(
        f"Returning {len(top_chunks)} reranked chunks "
        f"(fallback={used_fallback})"
    )
    return top_chunks, used_fallback
