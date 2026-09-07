import json
import re
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

DECOMPOSER_PROMPT = """You are an expert search query decomposer.
Your goal is to determine if a user's question contains multiple distinct questions that would require separate vector database searches.
- If it is a simple, single-part question, output a JSON array with just the original question.
- If it contains multiple distinct questions (e.g. "What is our Q3 revenue and who is the VP of Sales?"), break it down into a JSON array of separate questions.

Rules:
- DO NOT add conversational text.
- Output ONLY a valid JSON array of strings.

Examples:
Input: "What is the deployment process?"
Output: ["What is the deployment process?"]

Input: "Who is the CEO and what is the Slack channel for IT support?"
Output: ["Who is the CEO?", "What is the Slack channel for IT support?"]
"""

def decompose_query(query: str) -> list[str]:
    """Break a complex query down into multiple sub-queries."""
    q_lower = query.lower()
    multi_signals = [
        r"\b(?:what|who|where|when|why|how)\b.+\band\b.+\b(?:what|who|where|when|why|how)\b",
        r"\?\s*.+\?",  # Multiple question marks
        r"\balso\b",
        r"\badditionally\b",
        r"\bfurthermore\b",
    ]
    q_words = {"what", "who", "where", "when", "why", "which", "how"}
    q_word_count = sum(1 for w in q_lower.split() if w in q_words)
    has_multi = (any(re.search(p, q_lower) for p in multi_signals)
                 or q_word_count > 2 or query.count("?") > 1)

    if not has_multi:
        logger.info("[Decomposer] Single-part (0ms, 0 API calls)")
        return [query.strip()]

    messages = [
        SystemMessage(content=DECOMPOSER_PROMPT),
        HumanMessage(content=f"Input: \"{query}\"\nOutput:"),
    ]
    try:
        response, provider = call_llm(messages)
        content = response.content.strip()
        
        # Clean up markdown if the LLM adds it
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        parsed = json.loads(content)
        if isinstance(parsed, list) and all(isinstance(i, str) for i in parsed):
            return parsed
        else:
            raise ValueError("Parsed JSON is not a list of strings")
            
    except Exception as e:
        logger.warning(f"Failed to decompose query, defaulting to original query: {e}")
        return [query]
