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

import re as _re

# Prefix namespaces
_ANSWER_PREFIX = "rag:ans_v3:"
_EMBED_PREFIX = "rag:emb2048:"

_NEGATIVE_PATTERNS = [
    r"not (?:found|specified|mentioned|available|stated|covered)",
    r"no (?:information|details|data|records)",
    r"does not contain",
    r"cannot (?:find|locate|determine)",
    r"not covered in our verified enterprise database",
    r"general ai knowledge",
    r"notice:",
]


def _is_negative_response(answer: str) -> bool:
    ans_lower = answer.lower()
    return any(_re.search(p, ans_lower) for p in _NEGATIVE_PATTERNS)


def _hash_key(text: str, history: list[dict] | None = None) -> str:
    """Normalize and hash text and history to produce a deterministic, safe Redis key."""
    norm = " ".join(text.strip().lower().split())
    if history:
        tokens = set(_re.findall(r"\b\w+\b", norm))
        is_dependent = bool(tokens & {"it", "he", "she", "they", "him", "her", "his", "their", "them", "this", "that", "these", "those", "above", "earlier"})
        if is_dependent:
            last_user_msg = ""
            for msg in reversed(history):
                if msg.get("role") == "user":
                    last_user_msg = msg.get("content", "")
                    break
            if last_user_msg:
                norm += "||" + last_user_msg.strip().lower()
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:32]


def is_redis_configured() -> bool:
    """Check if Upstash Redis REST credentials are present."""
    return bool(settings.upstash_redis_rest_url and settings.upstash_redis_rest_token)


def get_cached_rag_response(query: str, history: list[dict] | None = None) -> dict[str, Any] | None:
    """
    Look up a previously synthesized RAG response for the given query and history.
    Returns:
        dict containing answer, sources, intent, suggestions, etc. or None if cache miss.
    """
    if not is_redis_configured():
        return None

    key = _ANSWER_PREFIX + _hash_key(query, history)
    try:
        url = f"{settings.upstash_redis_rest_url.rstrip('/')}/get/{key}"
        headers = {"Authorization": f"Bearer {settings.upstash_redis_rest_token}"}
        
        t0 = time.perf_counter()
        resp = httpx.get(url, headers=headers, timeout=2.0)
        
        if resp.status_code == 200:
            raw_val = resp.json().get("result")
            if raw_val:
                cached_data = json.loads(raw_val)
                ans_str = cached_data.get("answer", "")
                # Bypass negative cache hits so live Graph/Vector retrieval runs
                if _is_negative_response(ans_str):
                    logger.info(f"🔄 [Upstash Redis] Bypassing stale negative cache for: \"{query[:50]}...\"")
                    try:
                        del_url = f"{settings.upstash_redis_rest_url.rstrip('/')}/del/{key}"
                        httpx.get(del_url, headers=headers, timeout=1.5)
                    except Exception:
                        pass
                    return None
                
                elapsed_ms = (time.perf_counter() - t0) * 1000
                logger.info(f"⚡ [Upstash Redis] Cache HIT for query in {elapsed_ms:.1f}ms: \"{query[:50]}...\"")
                cached_data["cached"] = True
                cached_data["cache_latency_ms"] = round(elapsed_ms, 1)
                return cached_data
    except Exception as exc:
        logger.debug(f"[Upstash Redis] Cache lookup skipped ({exc!r})")

    return None


def set_cached_rag_response(query: str, data: dict[str, Any], ttl_seconds: int = 3600, history: list[dict] | None = None) -> bool:
    """
    Cache a synthesized RAG response with an expiration TTL (default 1 hour).
    """
    if not is_redis_configured():
        return False

    ans_str = data.get("answer", "")
    sources = data.get("sources", [])
    # Never cache negative, empty, or ungrounded responses
    if not ans_str or not sources or _is_negative_response(ans_str):
        return False

    key = _ANSWER_PREFIX + _hash_key(query, history)
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
                emb = json.loads(raw_val)
                if isinstance(emb, list) and len(emb) == settings.embedding_dimension:
                    return emb
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
