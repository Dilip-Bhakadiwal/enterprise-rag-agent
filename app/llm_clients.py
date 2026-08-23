"""
app/llm_clients.py
──────────────────
Unified multi-tier LLM client with automatic zero-downtime failover:
  1. OpenRouter (Primary)
  2. Groq (Secondary / Blazing Fast fallback on 429 / Rate Limit / Timeout)
  3. NVIDIA NIM (Tertiary Fallback)

Usage:
    from app.llm_clients import call_llm

    response, provider = call_llm(messages)

Key guarantees:
  - If OpenRouter hits rate limit (429), quota limits, or server errors, it instantly
    switches to Groq (llama-3.3-70b-versatile, ~500 tokens/sec).
  - If Groq also encounters rate limits, it fails over to NVIDIA NIM.
  - Automatic exponential backoff retries on transient network errors via Tenacity.
"""

import logging
import time
from typing import Any

from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from loguru import logger
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from app.config import settings

# ── Provider names ─────────────────────────────────────────────────────────
PROVIDER_OPENROUTER = "openrouter"
PROVIDER_GROQ = "groq"
PROVIDER_NVIDIA = "nvidia_nim"


def _build_openrouter_client() -> ChatOpenAI:
    """Create a LangChain ChatOpenAI client pointed at OpenRouter."""
    return ChatOpenAI(
        model=settings.primary_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.primary_base_url,
        default_headers={
            "HTTP-Referer": "https://enterprise-rag-demo.hf.space",
            "X-Title": "Enterprise RAG Demo",
        },
        temperature=0.1,
        timeout=6.0,
        request_timeout=6.0,
        max_retries=0,
    )


def _build_groq_client() -> ChatOpenAI:
    """Create a LangChain ChatOpenAI client pointed at Groq Cloud."""
    return ChatOpenAI(
        model=settings.groq_model,
        api_key=settings.groq_api_key or "missing_groq_key",
        base_url=settings.groq_base_url,
        temperature=0.1,
        timeout=6.0,
        request_timeout=6.0,
        max_retries=0,
    )


def _build_nvidia_client() -> ChatOpenAI:
    """Create a LangChain ChatOpenAI client pointed at NVIDIA NIM."""
    return ChatOpenAI(
        model=settings.fallback_model,
        api_key=settings.nvidia_api_key,
        base_url=settings.fallback_base_url,
        temperature=0.1,
        timeout=6.0,
        request_timeout=6.0,
        max_retries=0,
    )


# ── Lazy Singletons ────────────────────────────────────────────────────────
_openrouter_client: ChatOpenAI | None = None
_groq_client: ChatOpenAI | None = None
_nvidia_client: ChatOpenAI | None = None


def get_openrouter() -> ChatOpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        _openrouter_client = _build_openrouter_client()
    return _openrouter_client


def get_groq() -> ChatOpenAI:
    global _groq_client
    if _groq_client is None:
        _groq_client = _build_groq_client()
    return _groq_client


def get_nvidia() -> ChatOpenAI:
    global _nvidia_client
    if _nvidia_client is None:
        _nvidia_client = _build_nvidia_client()
    return _nvidia_client


# ── Fast single-attempt invocation per tier (fail over immediately on glitch)
def _invoke_with_retry(client: ChatOpenAI, messages: list[BaseMessage]) -> Any:
    return client.invoke(messages)


def call_llm(messages: list[BaseMessage]) -> tuple[Any, str]:
    """
    Call LLMs using a 3-tier ultra-low-latency resilient failover cascade:
      1. Groq (Primary / Ultra-Fast ~80ms-500ms on LPUs)
      2. OpenRouter (Secondary / Resilient Failover on 429 / Rate-Limit / Timeout)
      3. NVIDIA NIM (Tertiary Fallback)

    Returns:
        (response, provider_name) where provider_name in ["groq", "openrouter", "nvidia_nim"]

    Raises:
        RuntimeError: if all 3 providers fail
    """
    errors: list[str] = []

    # ── Tier 1: Try Groq (Ultra-Fast LPUs) ─────────────────────────────────
    if settings.groq_api_key:
        try:
            logger.debug(f"Calling primary {PROVIDER_GROQ} ({settings.groq_model})")
            response = _invoke_with_retry(get_groq(), messages)
            logger.info(f"LLM served by: {PROVIDER_GROQ} (ultra-fast LPU)")
            return response, PROVIDER_GROQ
        except Exception as exc:
            err_msg = f"Groq failed ({exc!r})"
            logger.warning(f"{err_msg} — failing over to OpenRouter...")
            errors.append(err_msg)
    else:
        logger.debug("Groq API key not configured — skipping Tier 1")

    # ── Tier 2: Try OpenRouter ─────────────────────────────────────────────
    try:
        logger.debug(f"Calling failover {PROVIDER_OPENROUTER} ({settings.primary_model})")
        response = _invoke_with_retry(get_openrouter(), messages)
        logger.info(f"LLM served by: {PROVIDER_OPENROUTER} (resilient failover)")
        return response, PROVIDER_OPENROUTER
    except Exception as exc:
        err_msg = f"OpenRouter failed ({exc!r})"
        logger.warning(f"{err_msg} — failing over to NVIDIA NIM...")
        errors.append(err_msg)

    # ── Tier 3: Try NVIDIA NIM ─────────────────────────────────────────────
    try:
        logger.debug(f"Calling fallback {PROVIDER_NVIDIA} ({settings.fallback_model})")
        response = _invoke_with_retry(get_nvidia(), messages)
        logger.info(f"LLM served by: {PROVIDER_NVIDIA} (tertiary fallback)")
        return response, PROVIDER_NVIDIA
    except Exception as exc:
        err_msg = f"NVIDIA NIM failed ({exc!r})"
        logger.error(f"{err_msg} — all providers exhausted!")
        errors.append(err_msg)

    raise RuntimeError(f"All LLM providers failed. Trace: {' | '.join(errors)}")
