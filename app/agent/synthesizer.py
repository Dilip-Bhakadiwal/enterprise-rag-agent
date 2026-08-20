"""
app/agent/synthesizer.py
─────────────────────────
Answer synthesis node for the LangGraph RAG pipeline.

Given a user query and top-5 retrieved chunks, generates a grounded,
cited answer using OpenRouter (→ NVIDIA NIM fallback).

Key behaviours:
  - Every claim must cite doc_id
  - On conflicting info: prefer higher-authority sources
    (confluence/official docs > github > jira > slack > email/gmail)
  - On conflicting timestamps: prefer more recent
  - If no relevant docs found: say so, do not hallucinate
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from loguru import logger

from app.llm_clients import call_llm

# ── Source authority ranking (higher = more authoritative) ─────────────────
SOURCE_AUTHORITY: dict[str, int] = {
    "confluence": 10,
    "notion": 9,
    "google_drive": 8,
    "onedrive": 8,
    "sharepoint": 8,
    "github": 7,
    "jira": 6,
    "teams": 5,
    "discord": 4,
    "slack": 3,
    "gmail": 2,
    "email": 2,
    "unknown": 1,
}

_SYNTHESIZER_SYSTEM_PROMPT = """\
You are a precise enterprise knowledge assistant. You answer questions
using ONLY the retrieved document chunks provided below.

Rules:
1. CITE every factual claim with its source using the format [doc_id].
2. If multiple chunks provide conflicting information, prefer:
   - Higher-authority sources (Confluence/official docs > GitHub > Jira > Slack > Email)
   - More recent timestamps when authority is equal
   - Explicitly note the conflict if it is significant.
3. If the retrieved chunks do not contain enough information to answer the question,
   say so clearly. Do NOT hallucinate or invent information.
4. Be concise but complete. Structure your answer with clear paragraphs.
5. At the end of your answer, include a "Sources used:" section listing each doc_id cited.
"""


def _build_context_block(chunks: list[dict]) -> str:
    """Format retrieved chunks into a numbered context block for the prompt."""
    if not chunks:
        return "No relevant documents were retrieved."

    lines = []
    for i, chunk in enumerate(chunks, 1):
        authority = SOURCE_AUTHORITY.get(chunk.get("source_type", "unknown"), 1)
        ts = chunk.get("timestamp", "unknown")
        author = chunk.get("author", "")
        author_str = f" | author: {author}" if author else ""

        lines.append(
            f"[{i}] doc_id={chunk['doc_id']} | "
            f"source={chunk['source_type']} | "
            f"authority={authority}/10 | "
            f"timestamp={ts}{author_str}\n"
            f"{chunk.get('chunk_text', '').strip()}"
        )
    return "\n\n".join(lines)


def synthesize_answer(
    query: str,
    chunks: list[dict],
    intent: str,
    used_fallback: bool,
) -> tuple[str, str]:
    """
    Generate a grounded answer from the retrieved chunks.

    Args:
        query:        The user's original question.
        chunks:       Top-k reranked chunk dicts from the retriever.
        intent:       Classified intent ("basic", "project_related", "conflicting_info").
        used_fallback: Whether the unfiltered retrieval fallback was triggered.

    Returns:
        (answer_text, provider_used)
    """
    context = _build_context_block(chunks)

    # Add a note if retrieval fallback was used
    fallback_note = (
        "\n\nNote: The initial source-filtered search returned no results. "
        "The context below was retrieved from all available sources."
        if used_fallback
        else ""
    )

    # Intent-specific instruction
    intent_hint = ""
    if intent == "conflicting_info":
        intent_hint = (
            "\n\nThis question is specifically about conflicting or inconsistent "
            "information. Pay special attention to comparing claims across different "
            "sources and call out any contradictions explicitly."
        )
    elif intent == "project_related":
        intent_hint = (
            "\n\nThis question is about a project, code, or task. "
            "Focus on technical details, ticket IDs, and code references."
        )

    user_message = (
        f"Question: {query}{intent_hint}{fallback_note}\n\n"
        f"Retrieved context:\n{context}"
    )

    messages = [
        SystemMessage(content=_SYNTHESIZER_SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    if not chunks:
        # Short-circuit: no docs retrieved, return a graceful no-answer
        logger.warning("No chunks available — returning no-context response")
        return (
            "I could not find relevant information in the enterprise knowledge base "
            "to answer your question. Please try rephrasing or check if the relevant "
            "documents have been indexed.",
            "no_retrieval",
        )

    try:
        response, provider = call_llm(messages)
        answer = response.content if hasattr(response, "content") else str(response)
        logger.info(
            f"Synthesizer answer generated (provider={provider}, "
            f"len={len(answer)} chars)"
        )
        return answer, provider
    except Exception as exc:
        logger.error(f"Synthesizer LLM call failed: {exc!r}")
        return (
            "An error occurred while generating the answer. Please try again later.",
            "error",
        )
