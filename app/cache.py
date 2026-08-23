"""
app/cache.py
────────────
Enterprise Serverless Caching Layer powered by Upstash Redis:
  1. Instant Query & Answer Caching: returns identical/frequent queries in ~5ms with 0 token spend.
  2. Embedding Vector Caching: caches 1024-dim NVIDIA NIM vectors to eliminate repeated embedding calls.
  3. Resilient Fallback: completely non-blocking; if Redis is unreachable, queries seamlessly proceed without error.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any
import httpx
from loguru import logger

from app.config import settings

# Prefix namespaces
_ANSWER_PREFIX = "rag:ans:"
_EMBED_PREFIX = "rag:emb:"


def _hash_key(text: str) -> str:
    """Normalize and hash text to produce a deterministic, safe Redis key."""
    norm = " ".join(text.strip().lower().split())
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:32]


def is_redis_configured() -> bool:
    """Check if Upstash Redis REST credentials are present."""
    return bool(settings.upstash_redis_rest_url and settings.upstash_redis_rest_token)


def get_cached_rag_response(query: str) -> dict[str, Any] | None:
    """
    Look up a previously synthesized RAG response for the given query.
    Returns:
        dict containing answer, sources, intent, suggestions, etc. or None if cache miss.
    """
    if not is_redis_configured():
        return None

    key = _ANSWER_PREFIX + _hash_key(query)
    try:
        url = f"{settings.upstash_redis_rest_url.rstrip('/')}/get/{key}"
        headers = {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}
        
        t0 = time.perf_counter()
        resp = httpx.get(url, headers=headers, timeout=2.0)
        
        if resp.status_code == 200:
            raw_val = resp.json().get("result")
            if raw_val:
                elapsed_ms = (time.perf_counter() - t0) * 1000
                logger.info(f"⚡ [Upstash Redis] Cache HIT for query in {elapsed_ms:.1f}ms: \"{query[:50]}...\"")
                cached_data = json.loads(raw_val)
                cached_data["cached"] = True
                cached_data["cache_latency_ms"] = round(elapsed_ms, 1)
                return cached_data
    except Exception as exc:
        logger.debug(f"[Upstash Redis] Cache lookup skipped ({exc!r})")

    return None


def set_cached_rag_response(query: str, data: dict[str, Any], ttl_seconds: int = 3600) -> bool:
    """
    Cache a synthesized RAG response with an expiration TTL (default 1 hour).
    """
    if not is_redis_configured():
        return False

    key = _ANSWER_PREFIX + _hash_key(query)
    try:
        # Prepare serializable payload
        payload = {
            "answer": data.get("answer", ""),
            "sources": data.get("sources", []),
            "intent": data.get("intent", "cached"),
            "provider_used": data.get("provider_used", "upstash_redis"),
            "used_fallback": False,
            "suggestions": data.get("suggestions", []),
            "telemetry": data.get("telemetry", {}),
        }
        json_str = json.dumps(payload)
        
        url = f"{settings.upstash_redis_rest_url.rstrip('/')}/set/{key}"
        headers = {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}
        
        # Upstash REST: POST /set/key?ex=seconds with raw body
        resp = httpx.post(
            f"{url}?ex={ttl_seconds}",
            headers=headers,
            content=json_str,
            timeout=2.0
        )
        if resp.status_code == 200:
            logger.debug(f"💾 [Upstash Redis] Cached response for \"{query[:50]}...\" (TTL={ttl_seconds}s)")
            return True
    except Exception as exc:
        logger.debug(f"[Upstash Redis] Cache save skipped ({exc!r})")

    return False


def get_cached_embedding(text: str) -> list[float] | None:
    """Look up a cached 1024-dim embedding vector."""
    if not is_redis_configured():
        return None

    key = _EMBED_PREFIX + _hash_key(text)
    try:
        url = f"{settings.upstash_redis_rest_url.rstrip('/')}/get/{key}"
        headers = {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}
        resp = httpx.get(url, headers=headers, timeout=1.5)
        if resp.status_code == 200:
            raw_val = resp.json().get("result")
            if raw_val:
                return json.loads(raw_val)
    except Exception:
        pass
    return None


def set_cached_embedding(text: str, embedding: list[float], ttl_seconds: int = 86400) -> bool:
    """Cache a 1024-dim embedding vector (default 24h TTL)."""
    if not is_redis_configured():
        return False

    key = _EMBED_PREFIX + _hash_key(text)
    try:
        url = f"{settings.upstash_redis_rest_url.rstrip('/')}/set/{key}"
        headers = {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}
        resp = httpx.post(
            f"{url}?ex={ttl_seconds}",
            headers=headers,
            content=json.dumps(embedding),
            timeout=1.5
        )
        return resp.status_code == 200
    except Exception:
        return False
