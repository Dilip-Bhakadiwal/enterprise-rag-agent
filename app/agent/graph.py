"""
app/agent/graph.py
──────────────────
LangGraph StateGraph definition for the Enterprise RAG pipeline.

Pipeline: Router → Decomposer → Retriever → Grader → (Rewriter loop / Synthesizer) → END

Features:
  - Full Citation Metadata: returns raw chunk_text, author, timestamp, score for interactive inspection.
  - Per-Node Telemetry Timings: tracks exact millisecond performance across each graph stage.
  - FinOps Token & Cost Estimation: calculates token economics for transparency.
  - Dynamic Smart Follow-up Suggestions: provides context-aware next questions.
"""

from __future__ import annotations

import time
from typing import TypedDict, Any
from langgraph.graph import StateGraph, END
from loguru import logger

from app.agent.router import classify_intent
from app.agent.retriever import retrieve_chunks
from app.agent.synthesizer import synthesize_answer
from app.agent.grader import grade_documents
from app.agent.rewriter import rewrite_query
from app.agent.decomposer import decompose_query


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
    retry_count: int
    sub_queries: list[str]
    timings: dict[str, float]
    suggestions: list[str]
    telemetry: dict[str, Any]


# ── Helper: Dynamic Follow-Up Question Generator ───────────────────────────

def _generate_smart_suggestions(query: str, intent: str, sources: list[dict]) -> list[str]:
    """Generates 3 contextual follow-up suggestions based on query and topic."""
    q_lower = query.lower()
    source_ids = [s.get("doc_id", "") for s in sources]
    is_portfolio = any("portfolio" in sid for sid in source_ids) or any(k in q_lower for k in ["dilip", "m.tech", "btech", "research", "marketpulse", "redwood", "ieee"])

    if is_portfolio:
        if "research" in q_lower or "ieee" in q_lower:
            return [
                "What dataset and accuracy did the Focal-CBAM Fish-YOLO model achieve?",
                "How was the YOLOv8 model deployed on the Xilinx FPGA accelerator?",
                "What is Dilip's M.Tech specialization from DIAT Pune?"
            ]
        elif "marketpulse" in q_lower:
            return [
                "How does MarketPulse AI handle real-time WebSocket ticker feeds?",
                "What SQL security guardrails are built into MarketPulse AI?",
                "Tell me about the Redwood Inference Enterprise RAG architecture."
            ]
        elif "education" in q_lower or "btech" in q_lower or "mtech" in q_lower or "college" in q_lower:
            return [
                "What published research did Dilip work on during his M.Tech?",
                "What are Dilip's core skills in LangGraph and FastAPI?",
                "How can I get in touch with Dilip or view his GitHub projects?"
            ]
        else:
            return [
                "What research has Dilip published with MoES funding on IEEE Xplore?",
                "How is the MarketPulse AI agentic terminal designed?",
                "Which colleges did Dilip attend for his B.Tech and M.Tech?"
            ]
    else:
        # Enterprise Dataset queries
        if any(k in q_lower for k in ["liability", "cap", "legal", "sop", "contract", "procurement"]):
            return [
                "What are the mandatory data breach carve-outs in the procurement SOP?",
                "What is the standard SLA penalty framework for cloud vendors?",
                "Are there conflicting Jira tickets regarding this vendor contract?"
            ]
        elif any(k in q_lower for k in ["deploy", "ci", "cd", "docker", "release", "sprint"]):
            return [
                "What is the rollback procedure if a deployment healthcheck fails?",
                "Show related pull request discussions and code review tickets on GitHub.",
                "What runtime flags are required for production cluster startup?"
            ]
        else:
            return [
                "What related discussions exist in Slack engineering channels?",
                "Are there any open Jira tickets or PRs tracking this issue?",
                "What official Confluence SOP documentation covers this policy?"
            ]


# ── Node Functions ─────────────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    """Node 1: Classify intent and determine source filter."""
    t0 = time.perf_counter()
    query = state["query"]
    logger.info(f"[Router] Processing query: {query[:80]}…")

    intent, source_filter, provider = classify_intent(query)
    elapsed = (time.perf_counter() - t0) * 1000

    timings = dict(state.get("timings", {}))
    timings["router_ms"] = round(elapsed, 1)

    return {
        **state,
        "intent": intent,
        "source_filter": source_filter,
        "router_provider": provider,
        "timings": timings,
    }


def decomposer_node(state: AgentState) -> AgentState:
    """Node 1.5: Decompose complex queries into multiple sub-queries."""
    t0 = time.perf_counter()
    query = state["query"]
    logger.info(f"[Decomposer] Analyzing query for multi-hop: {query[:80]}…")
    
    sub_queries = decompose_query(query)
    elapsed = (time.perf_counter() - t0) * 1000
    logger.info(f"[Decomposer] Generated {len(sub_queries)} sub-queries: {sub_queries}")
    
    timings = dict(state.get("timings", {}))
    timings["decomposer_ms"] = round(elapsed, 1)

    return {
        **state,
        "sub_queries": sub_queries,
        "timings": timings,
    }


def retriever_node(state: AgentState) -> AgentState:
    """Node 2: Retrieve relevant chunks from Pinecone (with fallback) for ALL sub-queries."""
    t0 = time.perf_counter()
    sub_queries = state.get("sub_queries", [state["query"]])
    source_filter = state.get("source_filter", [])
    
    all_chunks = []
    any_fallback = False
    
    for sq in sub_queries:
        logger.info(f"[Retriever] Query: {sq[:60]}… | filter={source_filter}")
        chunks, used_fallback = retrieve_chunks(sq, source_filter)
        all_chunks.extend(chunks)
        if used_fallback:
            any_fallback = True
            
    # Deduplicate chunks immediately by doc_id
    seen_ids = set()
    deduped_chunks = []
    for c in all_chunks:
        cid = c.get("doc_id", c.get("id", hash(c.get("text", ""))))
        if cid not in seen_ids:
            seen_ids.add(cid)
            deduped_chunks.append(c)

    elapsed = (time.perf_counter() - t0) * 1000
    timings = dict(state.get("timings", {}))
    timings["retriever_ms"] = round(elapsed, 1)

    return {
        **state,
        "retrieved_chunks": deduped_chunks,
        "used_fallback": any_fallback,
        "timings": timings,
    }


def grader_node(state: AgentState) -> AgentState:
    """Node 2.5: Grade retrieved documents for relevance."""
    t0 = time.perf_counter()
    query = state["query"]
    chunks = state.get("retrieved_chunks", [])
    logger.info(f"[Grader] Grading {len(chunks)} chunks for relevance...")
    
    relevant_chunks = grade_documents(query, chunks)
    elapsed = (time.perf_counter() - t0) * 1000
    logger.info(f"[Grader] {len(relevant_chunks)}/{len(chunks)} chunks deemed relevant in {elapsed:.1f}ms")
    
    timings = dict(state.get("timings", {}))
    timings["grader_ms"] = round(elapsed, 1)

    return {
        **state,
        "retrieved_chunks": relevant_chunks,
        "timings": timings,
    }


def rewriter_node(state: AgentState) -> AgentState:
    """Node: Rewrite query if retrieval failed (CRAG loop)."""
    t0 = time.perf_counter()
    query = state["query"]
    retry_count = state.get("retry_count", 0)
    logger.info(f"[Rewriter] Rewriting query '{query}' (Retry {retry_count+1})")
    
    new_query = rewrite_query(query)
    elapsed = (time.perf_counter() - t0) * 1000
    logger.info(f"[Rewriter] New query: '{new_query}' ({elapsed:.1f}ms)")
    
    timings = dict(state.get("timings", {}))
    timings["rewriter_ms"] = round(elapsed, 1)

    return {
        **state,
        "query": new_query,
        "sub_queries": [new_query],
        "retry_count": retry_count + 1,
        "timings": timings,
    }


def check_relevance(state: AgentState) -> str:
    """Conditional edge: check if we have relevant documents."""
    chunks = state.get("retrieved_chunks", [])
    retry_count = state.get("retry_count", 0)
    
    if len(chunks) > 0:
        return "synthesizer"
    elif retry_count >= 1:
        logger.warning("[CRAG] Max retries reached. Proceeding to synthesizer.")
        return "synthesizer"
    else:
        return "rewriter"


def synthesizer_node(state: AgentState) -> AgentState:
    """
    Node 3: Generate a grounded, cited answer from retrieved chunks.
    Extracts full raw chunk_text and metadata for the interactive Citation Inspector.
    """
    t0 = time.perf_counter()
    query = state["query"]
    chunks = state.get("retrieved_chunks", [])
    intent = state.get("intent", "basic")
    used_fallback = state.get("used_fallback", False)

    logger.info(
        f"[Synthesizer] Generating answer for intent='{intent}' with {len(chunks)} chunks"
    )

    answer, provider = synthesize_answer(query, chunks, intent, used_fallback)
    elapsed = (time.perf_counter() - t0) * 1000

    # ── Deduplicate sources and preserve full chunk text ───────────────────
    seen_doc_ids: set[str] = set()
    sources: list[dict] = []
    for chunk in chunks:
        doc_id = chunk.get("doc_id", "")
        if doc_id not in seen_doc_ids:
            seen_doc_ids.add(doc_id)
            raw_text = chunk.get("chunk_text", chunk.get("text", "")).strip()
            sources.append(
                {
                    "doc_id": doc_id,
                    "source_type": chunk.get("source_type", "unknown"),
                    "timestamp": chunk.get("timestamp", ""),
                    "author": chunk.get("author", ""),
                    "chunk_text": raw_text[:2000],  # preserve chunk text for inspector
                    "score": round(chunk.get("score", 0.0), 3) if chunk.get("score") else None,
                }
            )

    # ── Dynamic Smart Suggestions ──────────────────────────────────────────
    suggestions = _generate_smart_suggestions(query, intent, sources)

    # ── FinOps & Latency Telemetry ─────────────────────────────────────────
    timings = dict(state.get("timings", {}))
    timings["synthesizer_ms"] = round(elapsed, 1)
    total_ms = sum(timings.values())
    timings["total_ms"] = round(total_ms, 1)

    # Rough token estimation (1 token ~ 4 chars)
    prompt_tokens = sum(len(c.get("chunk_text", "")) for c in chunks) // 4 + len(query) // 4 + 200
    completion_tokens = len(answer) // 4
    total_tokens = prompt_tokens + completion_tokens
    # Llama 3.3 70B standard pricing (~$0.0001 per 1k tokens)
    estimated_cost = round((total_tokens / 1000) * 0.00012, 6)

    telemetry = {
        "total_time_ms": round(total_ms, 1),
        "router_ms": timings.get("router_ms", 0.0),
        "decomposer_ms": timings.get("decomposer_ms", 0.0),
        "retriever_ms": timings.get("retriever_ms", 0.0),
        "grader_ms": timings.get("grader_ms", 0.0),
        "synthesizer_ms": timings.get("synthesizer_ms", 0.0),
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "estimated_cost_usd": estimated_cost,
        "active_provider": provider,
        "failover_status": "healthy",
    }

    return {
        **state,
        "answer": answer,
        "sources": sources,
        "provider_used": provider,
        "suggestions": suggestions,
        "timings": timings,
        "telemetry": telemetry,
    }


# ── Graph Construction ─────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """Build and compile the LangGraph StateGraph."""
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("decomposer", decomposer_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("grader", grader_node)
    graph.add_node("rewriter", rewriter_node)
    graph.add_node("synthesizer", synthesizer_node)

    graph.set_entry_point("router")
    graph.add_edge("router", "decomposer")
    graph.add_edge("decomposer", "retriever")
    graph.add_edge("retriever", "grader")
    
    graph.add_conditional_edges(
        "grader",
        check_relevance,
        {
            "synthesizer": "synthesizer",
            "rewriter": "rewriter"
        }
    )
    
    graph.add_edge("rewriter", "retriever")
    graph.add_edge("synthesizer", END)

    compiled = graph.compile()
    logger.info("LangGraph agent compiled successfully")
    return compiled


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def ask(query: str) -> dict:
    """Run full RAG pipeline for a query with telemetry and suggestions."""
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
        "retry_count": 0,
        "sub_queries": [],
        "timings": {},
        "suggestions": [],
        "telemetry": {},
    }
    result = graph.invoke(initial_state)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "intent": result["intent"],
        "provider_used": result["provider_used"],
        "used_fallback": result["used_fallback"],
        "suggestions": result.get("suggestions", []),
        "telemetry": result.get("telemetry", {}),
    }
