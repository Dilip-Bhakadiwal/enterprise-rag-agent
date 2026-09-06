"""
app/agent/router.py
────────────────────
Intent classification node for the LangGraph RAG pipeline.

Classifies an incoming user question into one of three intents:
  - "basic"            → factual / definition / how-to (no platform filter)
  - "project_related"  → code, PRs, tickets, tasks → filter: jira, github
  - "conflicting_info" → asks about disagreements or inconsistencies

The classification uses a quick LLM call with a structured JSON output.
Uses OpenRouter (primary) → NVIDIA NIM (fallback) via llm_clients.

Returns:
    Updated AgentState with `intent` and `source_filter` populated.
"""

from __future__ import annotations

import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from loguru import logger

from app.llm_clients import call_llm

# ── Intent → source_type filter map ───────────────────────────────────────
INTENT_SOURCE_MAP: dict[str, list[str]] = {
    "basic": [],  # empty = no filter applied
    "project_related": ["jira", "github", "confluence"],
    "conflicting_info": [],  # search all sources for conflicts
    "chitchat": [],  # fast conversational greeting / casual chit-chat
}

CHITCHAT_PATTERNS = [
    r"^(hi|hello|hey|heya|howdy|sup|yo|hola|greetings)[!.,\s]*$",
    r"^(hi|hello|hey)\s+(there|nexora|copilot|assistant|bot|friend)[!.,\s]*$",
    r"^(how are you|how are you doing|how's it going|how are things|how do you do)[?!\s]*$",
    r"^(who are you|what are you|what is your name|tell me about yourself)[?!\s]*$",
    r"^(what can you do|how can you help|what are your capabilities|help me)[?!\s]*$",
    r"^(good morning|good afternoon|good evening|good day)[!.,\s]*$",
    r"^(thank you|thanks|thx|thanks a lot|thank you so much)[!.,\s]*$",
    r"^(bye|goodbye|see you|cya|take care)[!.,\s]*$",
]
_CHITCHAT_REGEX = re.compile("|".join(CHITCHAT_PATTERNS), re.IGNORECASE)

_ROUTER_SYSTEM_PROMPT = """\
You are an intent classifier for an enterprise knowledge base search system.
Classify the user's question into EXACTLY ONE of these intents:

- "basic"           : General factual questions, definitions, how-to, policies
- "project_related" : Questions about code, pull requests, tasks, tickets, sprints, bugs, features
- "conflicting_info": Questions explicitly asking about disagreements, conflicts, inconsistencies,
                      or comparing information from different sources
- "chitchat"        : Conversational greetings, politeness, casual small talk ("hi", "how are you", "who are you")

Respond with ONLY a valid JSON object and nothing else:
{"intent": "<basic|project_related|conflicting_info|chitchat>", "reason": "<one sentence explanation>"}
"""


def _extract_intent_from_response(raw: str) -> tuple[str, str]:
    """
    Parse LLM response to extract intent and reason.
    Handles responses that may have extra text before/after JSON.
    """
    # Try to extract JSON from the response
    match = re.search(r'\{[^{}]+\}', raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            intent = data.get("intent", "basic").strip().lower()
            reason = data.get("reason", "")
            if intent in INTENT_SOURCE_MAP:
                return intent, reason
        except json.JSONDecodeError:
            pass

    # Fallback: keyword-based classification
    raw_lower = raw.lower()
    if any(k in raw_lower for k in ["chitchat", "greeting", "hello", "small talk"]):
        return "chitchat", "keyword fallback"
    if any(k in raw_lower for k in ["project_related", "jira", "github", "ticket", "pull request"]):
        return "project_related", "keyword fallback"
    if any(k in raw_lower for k in ["conflicting", "conflict", "inconsisten", "disagree"]):
        return "conflicting_info", "keyword fallback"
    return "basic", "default fallback"


def classify_intent(query: str) -> tuple[str, list[str], str]:
    """
    Classify the user query intent and determine source_type filters.

    Args:
        query: The user's question.

    Returns:
        (intent, source_filter, provider_used)
        - intent:        One of "basic", "project_related", "conflicting_info", "chitchat"
        - source_filter: List of source_type strings to filter (empty = no filter)
        - provider_used: Which LLM provider answered the classification
    """
    q_stripped = query.strip()

    # 1. Immediate zero-latency fast-path for conversational greetings and small talk
    if _CHITCHAT_REGEX.match(q_stripped):
        logger.info(f"Router → intent='chitchat' (fast conversational rule) | query='{q_stripped}'")
        return "chitchat", [], "fast_rule"

    q_lower = q_stripped.lower()

    # Medical, literature, novel, knowledge graph, and AI systems queries must search ALL sources (no restrictive Jira filter)
    is_open_domain = any(
        k in q_lower
        for k in [
            "medical", "cancer", "carcinoma", "bcc", "cscc", "melanoma", "adrenal", "tumor", "tumors",
            "biopsy", "radiation", "chemotherapy", "surgery", "mohs", "skin", "lesion", "symptom", "treatment",
            "novel", "literature", "book", "author", "character", "triples", "cornwall", "erica vagans",
            "neo4j", "graph", "knowledge graph", "entity", "entities", "dilip", "nexora", "yolo", "fpga", "research"
        ]
    )

    messages = [
        SystemMessage(content=_ROUTER_SYSTEM_PROMPT),
        HumanMessage(content=f"Question: {query}"),
    ]

    try:
        response, provider = call_llm(messages)
        raw = response.content if hasattr(response, "content") else str(response)
        intent, reason = _extract_intent_from_response(raw)
        
        # If the query is about products, retail, or hardware, keep filter open so catalogs aren't blocked
        if is_open_domain and intent == "project_related" and not any(k in q_lower for k in ["jira", "github", "pull request", "pr ", "commit"]):
            intent = "basic"
            source_filter = []
        else:
            source_filter = INTENT_SOURCE_MAP[intent]

        logger.info(
            f"Router → intent='{intent}' | filter={source_filter} | "
            f"reason='{reason}' | provider={provider}"
        )
        return intent, source_filter, provider
    except Exception as exc:
        logger.error(f"Router classification failed: {exc!r} — defaulting to 'basic'")
        return "basic", [], "error_fallback"
