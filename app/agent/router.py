"""
app/agent/router.py
────────────────────
Intent classification node for the LangGraph RAG pipeline.

Classifies an incoming user question into one of three intents:
  - "basic"            → factual / definition / how-to (no platform filter)
  - "project_related"  → code, PRs, tickets, tasks → filter: jira, github
  - "conflicting_info" → asks about disagreements or inconsistencies
  - "chitchat"         → fast conversational greeting / casual chit-chat

Uses pure structural and signal detection (0ms latency, zero extra API calls).
"""

from __future__ import annotations

import re
from loguru import logger

# ── Intent → source_type filter map ───────────────────────────────────────
INTENT_SOURCE_MAP: dict[str, list[str]] = {
    "basic": [],  # empty = no filter applied
    "project_related": ["jira", "github", "confluence"],
    "conflicting_info": [],  # search all sources for conflicts
    "chitchat": [],  # fast conversational greeting / casual chit-chat
}


def classify_intent(query: str) -> tuple[str, list[str], str]:
    """
    Classify the user query intent and determine source_type filters
    using structural and pattern detection (0ms latency, 0 external LLM calls).

    Args:
        query: The user's question.

    Returns:
        (intent, source_filter, provider_used)
    """
    q = query.strip()
    q_lower = q.lower()
    tokens = [t for t in re.sub(r"[^\w\s]", " ", q_lower).split() if t]

    # 1. Structural chitchat (0ms)
    question_words = {
        "what", "who", "where", "when", "why", "which", "how",
        "explain", "describe", "is", "are", "can", "does"
    }
    has_q = any(t in question_words for t in tokens)

    # Ultra-short non-questions (e.g. "hi", "hey")
    if len(tokens) <= 2 and not has_q:
        logger.info(f"Router → intent='chitchat' (structural ultra-short) | query='{q}'")
        return "chitchat", [], "structural"

    greetings = {"hi", "hello", "hey", "hola", "howdy", "greetings", "yo", "sup"}
    if tokens and tokens[0] in greetings and len(tokens) <= 4 and not has_q:
        logger.info(f"Router → intent='chitchat' (structural greeting) | query='{q}'")
        return "chitchat", [], "structural"

    closings = {"thanks", "thank", "thx", "bye", "goodbye", "cya"}
    if all(t in closings or t in {"you", "a", "lot", "so", "much", "my", "see", "later", "take", "care", "friend"} for t in tokens):
        logger.info(f"Router → intent='chitchat' (structural closing) | query='{q}'")
        return "chitchat", [], "structural"

    # 2. Project signals (generic)
    if any(s in q_lower for s in {"jira", "github", "pull request", "commit", "ticket", "sprint", "deploy"}):
        logger.info(f"Router → intent='project_related' (structural project) | query='{q}'")
        return "project_related", ["jira", "github", "confluence"], "structural"

    # 3. Conflict signals
    if any(s in q_lower for s in {"conflict", "disagree", "inconsisten", "contradict", "differ between"}):
        logger.info(f"Router → intent='conflicting_info' (structural conflict) | query='{q}'")
        return "conflicting_info", [], "structural"

    # 4. Default: open search (NO LLM call)
    logger.info(f"Router → intent='basic' (default open search) | query='{q}'")
    return "basic", [], "default_open"
