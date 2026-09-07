"""app/agent/grader.py — Batch grading + semantic score bypass."""
import json, re
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

GRADER_BATCH_PROMPT = """You are a strict relevance grader.
Given a question and documents, identify which directly answer the question.
Do NOT mark relevant based on incidental word overlap.
Output ONLY valid JSON: {"relevant_ids": [1, 3]}"""

def grade_documents(query: str, chunks: list[dict]) -> list[dict]:
    if not chunks:
        return []

    # Graph facts from Neo4j are ALWAYS relevant (targeted Cypher)
    graph_chunks = [c for c in chunks if c.get("is_graph", False)]
    vector_chunks = [c for c in chunks if not c.get("is_graph", False)][:5]

    # BYPASS: High retrieval scores = skip LLM entirely (0ms, 0 API calls)
    high_conf = [c for c in vector_chunks
                 if c.get("combined_score", c.get("semantic_score", 0)) > 0.82]
    if len(high_conf) >= max(1, len(vector_chunks) // 2):
        logger.info(f"[Grader] BYPASS: {len(high_conf)} chunks via score")
        return graph_chunks + high_conf

    # BATCH: Grade ALL in ONE LLM call (not 5 sequential)
    if not vector_chunks:
        return graph_chunks

    docs_text = "\n\n".join(
        f"[{i}] {c.get('chunk_text', c.get('text', ''))[:800]}"
        for i, c in enumerate(vector_chunks, 1)
    )
    messages = [
        SystemMessage(content=GRADER_BATCH_PROMPT),
        HumanMessage(content=f"Question: {query}\n\nDocuments:\n{docs_text}")
    ]
    try:
        response, provider = call_llm(messages)
        content = response.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
        parsed = json.loads(content)
        ids = parsed.get("relevant_ids", [])
        relevant = [vector_chunks[i-1] for i in ids if 0 < i <= len(vector_chunks)]
        logger.info(f"[Grader] Batch: {len(relevant)}/{len(vector_chunks)} via {provider}")
        return graph_chunks + relevant
    except Exception as e:
        logger.warning(f"Batch grading failed: {e}")
        return chunks
