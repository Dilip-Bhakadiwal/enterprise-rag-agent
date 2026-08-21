from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

REWRITER_PROMPT = """You are an expert query optimizer for a vector database search engine.
Your task is to take a user's question and rewrite it to be a better semantic search query.
- Remove conversational fluff
- Clarify ambiguous terms
- Expand acronyms if obvious
- Extract the core intent

Output ONLY the rewritten query, with no quotes or markdown or conversational text.
"""

def rewrite_query(query: str) -> str:
    """Rewrite the user's query for better retrieval."""
    messages = [
        SystemMessage(content=REWRITER_PROMPT),
        HumanMessage(content=f"Original Question: {query}\n\nRewritten Query:"),
    ]
    try:
        response, provider = call_llm(messages)
        rewritten = response.content.strip().strip('"').strip("'")
        return rewritten
    except Exception as e:
        logger.error(f"Failed to rewrite query: {e}")
        return query
