import json
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

GRADER_PROMPT = """You are a strict relevance grader assessing whether a retrieved document actually contains information that directly addresses, answers, or provides factual evidence for the user's specific question.

Grading Criteria:
1. Grade "yes" if the document contains facts, definitions, data, or context that genuinely helps answer the user's question.
2. Grade "no" if the document is from an unrelated domain or topic, even if it happens to mention isolated common words (for example: if the question asks about the color of the sun, and the document discusses UV radiation causes of skin cancer, grade "no" because it does not answer what color the sun is).
3. Do NOT mark a document as relevant based solely on incidental or accidental word overlap.

Output strictly valid JSON with a single key "score" set to "yes" or "no":
{"score": "yes"} or {"score": "no"}
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
        logger.warning(f"Failed to parse grader response: {e}, checking text directly")
        c_lower = content.lower() if 'content' in locals() else ""
        if '"score": "yes"' in c_lower or '"score":"yes"' in c_lower or 'yes' in c_lower:
            return True
        return False  # Strict default if parsing fails

def grade_documents(query: str, chunks: list[dict]) -> list[dict]:
    """Score all chunks and return only the relevant ones."""
    if not chunks:
        return []
        
    relevant_chunks = []
    for i, chunk in enumerate(chunks):
        # Chunks store content under "chunk_text"; fall back to "text" for safety
        text = chunk.get("chunk_text", chunk.get("text", ""))
        # Quick fallback if text is empty — accept chunk and move on
        if not text:
            relevant_chunks.append(chunk)
            continue
            
        is_relevant = grade_chunk(query, text)
        if is_relevant:
            relevant_chunks.append(chunk)
            
    return relevant_chunks
