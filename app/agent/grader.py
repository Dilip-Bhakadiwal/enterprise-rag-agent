import json
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

GRADER_PROMPT = """You are a relevance grader assessing whether a retrieved document is relevant to a user's question.
If the document contains keywords, semantic meaning, or facts relevant to answering the question, grade it as relevant.
It does not need to answer the entire question, just be useful.

Output strictly valid JSON with a single key "score" set to "yes" or "no".
Example output:
{"score": "yes"}
"""

def grade_chunk(query: str, chunk_text: str) -> bool:
    """Grade a single chunk for relevance against the query."""
    messages = [
        SystemMessage(content=GRADER_PROMPT),
        HumanMessage(content=f"Question: {query}\n\nDocument: {chunk_text}\n\nDecision JSON:"),
    ]
    try:
        response, provider = call_llm(messages)
        content = response.content.strip()
        # Clean up in case the model added markdown blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        parsed = json.loads(content)
        return parsed.get("score", "no").lower() == "yes"
    except Exception as e:
        logger.warning(f"Failed to parse grader response, defaulting to yes: {e}")
        return True  # Safe fallback if JSON parsing fails

def grade_documents(query: str, chunks: list[dict]) -> list[dict]:
    """Score all chunks and return only the relevant ones."""
    if not chunks:
        return []
        
    relevant_chunks = []
    for i, chunk in enumerate(chunks):
        text = chunk.get("text", "")
        # Quick fallback if text is empty
        if not text:
            relevant_chunks.append(chunk)
            continue
            
        is_relevant = grade_chunk(query, text)
        if is_relevant:
            relevant_chunks.append(chunk)
            
    return relevant_chunks
