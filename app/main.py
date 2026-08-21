"""
app/main.py
────────────
FastAPI application for the Enterprise RAG demo.

Endpoints:
    POST /ask      → Run the RAG pipeline, return answer + sources
    GET  /health   → Health check (used by HF Spaces)

Frontend:
    The `frontend/` directory is mounted as static files at `/`.
    This means the app is self-contained: one URL, one container.

CORS:
    Enabled for all origins in development. In production, the frontend
    is served from the same origin, so CORS headers are technically not
    needed — but we keep them here for local dev convenience (when you
    run the Stitch-preview or any other dev server separately).
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pydantic import BaseModel, Field

from app.config import settings
from app.agent.graph import get_graph, ask as agent_ask


# ── Request / Response models ──────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="The user's question to the knowledge base",
        examples=["What is the deployment process for the mobile app?"],
    )


class SourceItem(BaseModel):
    doc_id: str
    source_type: str
    timestamp: str
    author: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    intent: str
    provider_used: str
    used_fallback: bool
    response_time_ms: float


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"


# ── App lifespan (warm up model on startup) ────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up the LangGraph agent (loads FastEmbed model) on startup."""
    logger.info("Starting up Enterprise RAG API …")
    try:
        # Pre-load the graph (initialises FastEmbed model singleton)
        get_graph()
        logger.info("LangGraph agent warmed up successfully")
    except Exception as exc:
        logger.error(f"Startup warm-up failed: {exc!r} — app will still start")
    yield
    logger.info("Enterprise RAG API shutting down")


# ── FastAPI app ────────────────────────────────────────────────────────────

app = FastAPI(
    title="Enterprise RAG Demo",
    description=(
        "Agentic RAG over enterprise knowledge base (Slack, GitHub, Jira, "
        "Confluence, Gmail) using LangGraph + Pinecone + OpenRouter."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── API Endpoints ──────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    """Health check endpoint — used by HF Spaces and CI."""
    return HealthResponse(status="ok")


@app.post("/ask", response_model=AskResponse, tags=["rag"])
async def ask_question(request: AskRequest):
    """
    Run the RAG pipeline for the given question.

    Returns the answer, deduplicated source citations, intent classification,
    which LLM provider was used, and whether retrieval fallback was triggered.
    """
    start = time.perf_counter()
    query = request.question.strip()
    logger.info(f"POST /ask | question={query[:80]}…")

    try:
        result = agent_ask(query)
    except Exception as exc:
        logger.error(f"Agent error: {exc!r}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(exc)}",
        ) from exc

    elapsed_ms = (time.perf_counter() - start) * 1000

    return AskResponse(
        answer=result["answer"],
        sources=[SourceItem(**s) for s in result["sources"]],
        intent=result["intent"],
        provider_used=result["provider_used"],
        used_fallback=result["used_fallback"],
        response_time_ms=round(elapsed_ms, 2),
    )


@app.get("/api/info", tags=["system"])
async def app_info():
    """Return non-sensitive app configuration info."""
    return {
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
        "pinecone_index": settings.pinecone_index_name,
        "primary_model": settings.primary_model,
        "fallback_model": settings.fallback_model,
        "top_k_retrieve": settings.top_k_retrieve,
        "top_k_rerank": settings.top_k_rerank,
    }


# ── Static frontend ────────────────────────────────────────────────────────
# Mount AFTER API routes so the API takes precedence.
# Serves the built React app from react-frontend/dist/
# Build it first with: cd react-frontend && npm run build
_FRONTEND_DIR = Path(__file__).parent.parent / "react-frontend" / "dist"
if _FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(_FRONTEND_DIR), html=True),
        name="frontend",
    )
    logger.info(f"React frontend mounted from: {_FRONTEND_DIR}")
else:
    logger.warning(f"React frontend build not found at {_FRONTEND_DIR} — run: cd react-frontend && npm run build")


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
