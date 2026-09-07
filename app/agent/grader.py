"""app/agent/grader.py — Listwise LLM Reranker & Batch Relevance Grader."""
import json, re
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

LISTWISE_RERANKER_PROMPT = """You are an expert search reranker and relevance grader.
Given a user query and numbered document excerpts, identify which documents directly provide facts to answer the query.
Rank the relevant documents in descending order of relevance (most informative first).

Rules:
1. Exclude documents that only have incidental word overlap but do not actually help answer the query.
2. Output ONLY a valid JSON object:
   {"ranked_relevant_ids": [2, 1], "reason": "Doc 2 directly contains the diagnostic protocol."}
"""

def grade_documents(query: str, chunks: list[dict]) -> list[dict]:
    """
    Listwise LLM Reranker & Grader:
    Filters out noise and sorts candidate vector chunks in order of deep semantic relevance.
    Acts as a zero-RAM, zero-cost cross-encoder substitute.
    """
    if not chunks:
        return []

    # Graph facts from Neo4j AuraDB are ALWAYS curated and prioritized
    graph_chunks = [c for c in chunks if c.get("is_graph", False)]
    vector_chunks = [c for c in chunks if not c.get("is_graph", False)][:6]

    # FAST BYPASS: If top chunks already have exceptionally high similarity score (>0.85),
    # skip LLM invocation to conserve API quota and achieve sub-second execution
    high_conf = [c for c in vector_chunks
                 if c.get("combined_score", c.get("semantic_score", 0)) > 0.85]
    if len(high_conf) >= max(1, len(vector_chunks) // 2):
        logger.info(f"[Reranker] FAST BYPASS: {len(high_conf)} high-confidence chunks preserved via score")
        return graph_chunks + high_conf

    if not vector_chunks:
        return graph_chunks

    # BATCH LISTWISE RERANKING: Grade and rank all candidates in ONE single LLM call
    docs_text = "\n\n".join(
        f"[{i}] {c.get('chunk_text', c.get('text', ''))[:700]}"
        for i, c in enumerate(vector_chunks, 1)
    )
    messages = [
        SystemMessage(content=LISTWISE_RERANKER_PROMPT),
        HumanMessage(content=f"Query: {query}\n\nCandidate Documents:\n{docs_text}")
    ]
    try:
        response, provider = call_llm(messages)
        content = response.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
        parsed = json.loads(content)
        ranked_ids = parsed.get("ranked_relevant_ids") or parsed.get("relevant_ids", [])
        
        # Build reranked list
        reranked = [vector_chunks[i-1] for i in ranked_ids if 0 < i <= len(vector_chunks)]
        logger.info(f"[Listwise Reranker] Reranked {len(reranked)}/{len(vector_chunks)} chunks via {provider}: {parsed.get('reason', '')}")
        return graph_chunks + reranked
    except Exception as e:
        logger.warning(f"Listwise reranking fallback: {e}")
        return chunks
