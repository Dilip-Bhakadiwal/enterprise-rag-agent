"""
app/agent/graph.py
──────────────────
LangGraph StateGraph definition for the Enterprise RAG pipeline.

Pipeline: Router → Retriever → Synthesizer → END

State object carries:
    query            : str   — user's original question
    intent           : str   — classified intent (basic/project_related/conflicting_info)
    source_filter    : list  — Pinecone metadata filter list
    retrieved_chunks : list  — top-k chunks from retriever
    used_fallback    : bool  — whether unfiltered fallback was triggered
    answer           : str   — final generated answer
    sources          : list  — deduplicated source metadata for response
    provider_used    : str   — which LLM provider generated the answer
    router_provider  : str   — which LLM provider did routing

Usage:
    from app.agent.graph import build_graph

    app = build_graph()
    result = app.invoke({"query": "What is the deployment process?"})
    print(result["answer"])
    print(result["sources"])
"""

from __future__ import annotations

from typing import TypedDict, Annotated
import operator

from langgraph.graph import StateGraph, END
from loguru import logger

from app.agent.router import classify_intent
from app.agent.retriever import retrieve_chunks
from app.agent.synthesizer import synthesize_answer


# ── State Schema ───────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """Shared state object passed between all graph nodes."""
    query: str
    intent: str
    source_filter: list[str]
    retrieved_chunks: list[dict]
    used_fallback: bool
    answer: str
    sources: list[dict]
    provider_used: str
    router_provider: str


# ── Node Functions ─────────────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    """
    Node 1: Classify intent and determine source filter.
    """
    query = state["query"]
    logger.info(f"[Router] Processing query: {query[:80]}…")

    intent, source_filter, provider = classify_intent(query)

    return {
        **state,
        "intent": intent,
        "source_filter": source_filter,
        "router_provider": provider,
    }


def retriever_node(state: AgentState) -> AgentState:
    """
    Node 2: Retrieve relevant chunks from Pinecone (with fallback).
    """
    query = state["query"]
    source_filter = state.get("source_filter", [])
    logger.info(
        f"[Retriever] Query: {query[:60]}… | filter={source_filter}"
    )

    chunks, used_fallback = retrieve_chunks(query, source_filter)

    return {
        **state,
        "retrieved_chunks": chunks,
        "used_fallback": used_fallback,
    }


def synthesizer_node(state: AgentState) -> AgentState:
    """
    Node 3: Generate a grounded, cited answer from retrieved chunks.
    Also deduplicates sources by doc_id.
    """
    query = state["query"]
    chunks = state.get("retrieved_chunks", [])
    intent = state.get("intent", "basic")
    used_fallback = state.get("used_fallback", False)

    logger.info(
        f"[Synthesizer] Generating answer for intent='{intent}' "
        f"with {len(chunks)} chunks"
    )

    answer, provider = synthesize_answer(query, chunks, intent, used_fallback)

    # ── Deduplicate sources by doc_id ──────────────────────────────────────
    # Multiple chunks may come from the same doc — keep only first occurrence
    seen_doc_ids: set[str] = set()
    sources: list[dict] = []
    for chunk in chunks:
        doc_id = chunk.get("doc_id", "")
        if doc_id not in seen_doc_ids:
            seen_doc_ids.add(doc_id)
            sources.append(
                {
                    "doc_id": doc_id,
                    "source_type": chunk.get("source_type", "unknown"),
                    "timestamp": chunk.get("timestamp", ""),
                    "author": chunk.get("author", ""),
                }
            )

    return {
        **state,
        "answer": answer,
        "sources": sources,
        "provider_used": provider,
    }


# ── Graph Construction ─────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Build and compile the LangGraph StateGraph.

    Returns a compiled graph that can be invoked with:
        result = graph.invoke({"query": "your question"})
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("router", router_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("synthesizer", synthesizer_node)

    # Wire edges: router → retriever → synthesizer → END
    graph.set_entry_point("router")
    graph.add_edge("router", "retriever")
    graph.add_edge("retriever", "synthesizer")
    graph.add_edge("synthesizer", END)

    compiled = graph.compile()
    logger.info("LangGraph agent compiled successfully")
    return compiled


# ── Singleton graph instance ───────────────────────────────────────────────
_graph = None


def get_graph():
    """Return the singleton compiled graph, building it on first call."""
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def ask(query: str) -> dict:
    """
    Convenience function: run the full RAG pipeline for a query.

    Args:
        query: The user's question.

    Returns:
        Dict with keys: answer, sources, intent, provider_used, used_fallback
    """
    graph = get_graph()
    initial_state: AgentState = {
        "query": query,
        "intent": "",
        "source_filter": [],
        "retrieved_chunks": [],
        "used_fallback": False,
        "answer": "",
        "sources": [],
        "provider_used": "",
        "router_provider": "",
    }
    result = graph.invoke(initial_state)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "intent": result["intent"],
        "provider_used": result["provider_used"],
        "used_fallback": result["used_fallback"],
    }


# ── CLI test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What is the deployment process?"
    logger.info(f"Testing graph with query: {query}")
    result = ask(query)
    print("\n--- ANSWER ---")
    print(result["answer"])
    print("\n--- SOURCES ---")
    for src in result["sources"]:
        print(f"  [{src['doc_id']}] {src['source_type']} | {src['timestamp']}")
    print(f"\n--- META ---")
    print(f"  Intent: {result['intent']}")
    print(f"  Provider: {result['provider_used']}")
    print(f"  Fallback used: {result['used_fallback']}")
