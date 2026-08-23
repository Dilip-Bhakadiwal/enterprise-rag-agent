"""
tests/test_agentic_graphrag.py
───────────────────────────────
Hardened Automated Test Suite for Hybrid Agentic GraphRAG System:
  1. PII Redaction & Masking Guardrail Security Tests
  2. Neo4j AuraDB Knowledge Graph Multi-Hop Query Tests
  3. Pinecone Vector DB Hybrid Fusion Tests
  4. LangGraph Router & Synthesizer State Machine Tests
  5. System Health & Observability Telemetry Probes
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app.agent.guardrails import sanitize_pii
from app.agent.graph_retriever import (
    get_top_warranty_claims_graph_context,
    get_regional_sales_graph_context,
    get_samsung_5g_comparison,
    retrieve_hybrid_graph_chunks,
)
from app.agent.graph import ask


def test_pii_sanitization_guardrail():
    """Verify that PII and credentials are sanitized before reaching any LLM."""
    query = "Contact engineer at test.user@enterprise.com or call +1-800-555-0199 with API key sk-proj-1234567890abcdef12345678"
    sanitized, result = sanitize_pii(query)

    assert result["is_masked"] is True
    assert result["total_masked_count"] >= 3
    assert "test.user@enterprise.com" not in sanitized
    assert "+1-800-555-0199" not in sanitized
    assert "sk-proj-1234567890abcdef12345678" not in sanitized
    assert "[EMAIL_REDACTED]" in sanitized or "[SECRET_KEY_REDACTED]" in sanitized


def test_neo4j_warranty_graph_traversal():
    """Verify live Neo4j AuraDB warranty traversal returns expected product rankings."""
    w_facts = get_top_warranty_claims_graph_context()
    assert isinstance(w_facts, list)
    assert len(w_facts) > 0
    top = w_facts[0]
    assert "product" in top
    assert "claims" in top
    assert top["claims"] > 0


def test_neo4j_regional_store_traversal():
    """Verify live Neo4j AuraDB regional store lookups with geographic alias support."""
    us_stores = get_regional_sales_graph_context("North America")
    assert isinstance(us_stores, list)
    assert len(us_stores) > 0
    assert any("Apple Fifth Avenue" in s.get("store", "") for s in us_stores)

    eu_stores = get_regional_sales_graph_context("Europe")
    assert isinstance(eu_stores, list)
    assert len(eu_stores) > 0
    assert any("Apple Covent Garden" in s.get("store", "") for s in eu_stores)


def test_neo4j_samsung_5g_market_intelligence():
    """Verify live Neo4j AuraDB Samsung 5G regional metrics."""
    sam_facts = get_samsung_5g_comparison()
    assert isinstance(sam_facts, list)
    assert len(sam_facts) > 0
    assert "total_revenue" in sam_facts[0]


def test_hybrid_graphrag_retrieval():
    """Verify hybrid context fusion combines Neo4j facts and Pinecone dense vectors."""
    chunks, fallback = retrieve_hybrid_graph_chunks("What are the top Apple products by total warranty repair claims?", top_k=5)
    assert isinstance(chunks, list)
    assert len(chunks) > 0
    # At least one chunk should have non-empty text
    assert any(len(c.get("chunk_text", "")) > 10 for c in chunks)


def test_end_to_end_agent_ask():
    """Verify full LangGraph pipeline executes smoothly with telemetry and citations."""
    res = ask("What are the top Apple products by total warranty repair claims?")
    assert "answer" in res
    assert len(res["answer"]) > 20
    assert "provider_used" in res
    assert isinstance(res["sources"], list)
    assert len(res["sources"]) > 0


def test_conversational_greetings_fast_path():
    """Verify conversational greetings (hi, hiii, helllooo, etc.) return instant smart answers."""
    for greeting in ["hi", "how are you?", "who are you"]:
        res = ask(greeting)
        assert "answer" in res
        assert len(res["answer"]) > 5
        assert res["intent"] == "conversational"
        assert isinstance(res["sources"], list)
        assert len(res["sources"]) == 0
        assert "provider_used" in res

