"""
app/llm_clients.py
──────────────────
Unified LLM client: OpenRouter (primary) → NVIDIA NIM (fallback).

Usage:
    from app.llm_clients import get_llm, call_llm

    llm, provider = get_llm()
    response = llm.invoke(messages)

The `call_llm` helper wraps retries + automatic provider fallback:
  - On 429 / timeout from OpenRouter → switches to NVIDIA NIM
  - Tenacity handles transient errors with exponential backoff
"""

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
import logging
import httpx

from app.config import settings

# ── Provider names ─────────────────────────────────────────────────────────
PROVIDER_OPENROUTER = "openrouter"
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
        max_retries=0,  # we handle retries ourselves with tenacity
    )


def _build_nvidia_client() -> ChatOpenAI:
    """Create a LangChain ChatOpenAI client pointed at NVIDIA NIM."""
    return ChatOpenAI(
        model=settings.fallback_model,
        api_key=settings.nvidia_api_key,
        base_url=settings.fallback_base_url,
        temperature=0.1,
        max_retries=0,
    )


# ── Singletons built lazily ────────────────────────────────────────────────
_openrouter_client: ChatOpenAI | None = None
_nvidia_client: ChatOpenAI | None = None


def get_openrouter() -> ChatOpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        _openrouter_client = _build_openrouter_client()
    return _openrouter_client


def get_nvidia() -> ChatOpenAI:
    global _nvidia_client
    if _nvidia_client is None:
        _nvidia_client = _build_nvidia_client()
    return _nvidia_client


# ── Retry decorator for rate-limited calls ─────────────────────────────────
def _is_rate_limit_error(exc: Exception) -> bool:
    """Detect 429 / rate-limit errors from either provider."""
    msg = str(exc).lower()
    return "429" in msg or "rate limit" in msg or "too many requests" in msg


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    before_sleep=before_sleep_log(logging.getLogger("tenacity"), logging.WARNING),
    reraise=True,
)
def _call_with_retry(client: ChatOpenAI, messages: list[BaseMessage]) -> Any:
    """Call the LLM with automatic exponential-backoff retries."""
    return client.invoke(messages)


def call_llm(
    messages: list[BaseMessage],
) -> tuple[Any, str]:
    """
    Call the primary LLM (OpenRouter), falling back to NVIDIA NIM on failure.

    Returns:
        (response, provider_name) where provider_name is "openrouter" or "nvidia_nim"

    Raises:
        RuntimeError: if both providers fail
    """
    # ── Try OpenRouter first ───────────────────────────────────────────────
    try:
        logger.debug(f"Calling {PROVIDER_OPENROUTER} ({settings.primary_model})")
        response = _call_with_retry(get_openrouter(), messages)
        logger.info(f"LLM served by: {PROVIDER_OPENROUTER}")
        return response, PROVIDER_OPENROUTER
    except Exception as primary_exc:
        logger.warning(
            f"OpenRouter failed ({primary_exc!r}), falling back to NVIDIA NIM"
        )

    # ── Fallback: NVIDIA NIM ───────────────────────────────────────────────
    try:
        logger.debug(f"Calling fallback {PROVIDER_NVIDIA} ({settings.fallback_model})")
        response = _call_with_retry(get_nvidia(), messages)
        logger.info(f"LLM served by: {PROVIDER_NVIDIA} (fallback)")
        return response, PROVIDER_NVIDIA
    except Exception as fallback_exc:
        logger.error(f"Both LLM providers failed. Last error: {fallback_exc!r}")
        raise RuntimeError(
            f"All LLM providers failed. Primary: {primary_exc!r}. "
            f"Fallback: {fallback_exc!r}"
        ) from fallback_exc
