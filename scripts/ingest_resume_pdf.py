"""
scripts/ingest_resume_pdf.py
─────────────────────────────
Reads Dilip Bhakadiwal's resume PDF, splits into semantic chunks,
generates 1024-dim NVIDIA NIM embeddings, and upserts into Pinecone.

Same embedding + upsert pattern as ingest_portfolio.py.

Usage:
    python scripts/ingest_resume_pdf.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
import pdfplumber
from loguru import logger
from pinecone import Pinecone

from app.config import settings

PDF_PATH = "C:/Users/EXNOX/Downloads/DILIP_resume.pdf"


def extract_pdf_text(path: str) -> str:
    """Extract all text from a PDF file."""
    with pdfplumber.open(path) as pdf:
        pages = [p.extract_text() or "" for p in pdf.pages]
    return "\n\n".join(p for p in pages if p.strip())


def build_chunks() -> list[dict]:
    """
    Manually crafted semantic chunks from the resume PDF.
    Each chunk is a focused semantic section for precision retrieval.
    """
    return [
        {
            "doc_id": "resume_dilip_overview",
            "title": "Dilip Bhakadiwal — Resume Overview & Contact",
            "content": (
                "Dilip Bhakadiwal — AI/ML Engineer Resume\n"
                "Contact: +91-8003046831 | 9828dilip@gmail.com | "
                "linkedin.com/in/dilip-bhakadiwal | github.com/Dilip-Bhakadiwal/AI-Projects\n"
                "Location: Jaipur, Rajasthan (Open to Remote)\n\n"
                "AI/ML Engineer specializing in Agentic workflows, GraphRAG, and high-performance "
                "LLM orchestration. Proven experience architecting scalable multi-agent systems, "
                "deploying open-source models locally (Llama 3.3, Qwen), and optimizing retrieval "
                "pipelines for enterprise-grade, sub-second inference."
            ),
        },
        {
            "doc_id": "resume_dilip_skills",
            "title": "Dilip Bhakadiwal — Technical Skills",
            "content": (
                "Dilip Bhakadiwal Technical Skills:\n\n"
                "Agentic AI & Orchestration: LangGraph, LangChain, Model Context Protocol (MCP), ReAct Agent Workflows\n"
                "Backend & Cloud Pipelines: FastAPI, AWS, Docker, Render, GitHub Actions (CI/CD)\n"
                "Data Processing & Retrieval: GraphRAG, Neo4j, Pinecone, PostgreSQL, FastEmbed, Redis\n"
                "LLM Integration & Evals: LangSmith, Prompt Guardrails, PII Redaction\n"
                "Programming & Tools: Python, PyTorch, TypeScript, React, Git, Pandas, NumPy"
            ),
        },
        {
            "doc_id": "resume_dilip_education",
            "title": "Dilip Bhakadiwal — Education (DIAT Pune & MBM University Jodhpur)",
            "content": (
                "Dilip Bhakadiwal Education:\n\n"
                "1. Defence Institute of Advanced Technology (DIAT), Pune, Maharashtra — 2024 to 2026\n"
                "   Master of Technology (M.Tech) in Artificial Intelligence\n"
                "   CGPA: 7.33\n\n"
                "2. MBM University (MBM Engineering College), Jodhpur, Rajasthan — 2019 to 2023\n"
                "   Bachelor of Engineering (B.E.) in Electronics and Computer Engineering\n"
                "   GATE 2023 Qualified"
            ),
        },
        {
            "doc_id": "resume_dilip_projects",
            "title": "Dilip Bhakadiwal — Key AI Engineering Projects (Nexora AI, AlignAI)",
            "content": (
                "Dilip Bhakadiwal Key AI Engineering Projects:\n\n"
                "1. Nexora AI: Enterprise GraphRAG Platform (2026)\n"
                "   Technologies: LangGraph, Neo4j, Pinecone, Groq LPU\n"
                "   - Architected a multi-agent GraphRAG platform unifying Neo4j Cypher traversals "
                "with Pinecone semantic search, achieving 99.4% multi-hop retrieval accuracy.\n"
                "   - Engineered a sub-second (<200ms) LPU inference pipeline using Groq with "
                "automated failover, deployed as a fully containerized React and FastAPI architecture on Render.\n"
                "   - Implemented an ephemeral memory engine with active PII redaction guardrails "
                "(stripping SSNs, API keys) and strict rate-limiting for enterprise-grade data security.\n\n"
                "2. AlignAI Engine: Autonomous Job Discovery (2026)\n"
                "   Technologies: LangGraph, Pinecone, Neo4j, FastEmbed\n"
                "   - Developed a LangGraph-orchestrated multi-agent state machine to autonomously "
                "ingest and normalize API-sourced job postings, processing 100+ roles/minute and "
                "eliminating 85% of keyword-matching noise.\n"
                "   - Designed a 3-signal fit-ranking algorithm combining dense cosine similarity, "
                "Neo4j graph coverage, and LLM evaluation for explainable candidate-role alignment.\n"
                "   - Built a SHA-256 caching architecture utilizing RapidFuzz for continuous entity "
                "resolution, eliminating graph node duplication and automatically recomputing vectors "
                "on profile updates."
            ),
        },
        {
            "doc_id": "resume_dilip_research_pubs",
            "title": "Dilip Bhakadiwal — Research Experience & Publications (MoES, IEEE Xplore, ICASA)",
            "content": (
                "Dilip Bhakadiwal Research Experience and Publications:\n\n"
                "1. Edge AI Object Detection System on FPGA and Jetson Platforms\n"
                "   Period: September 2025 to January 2026\n"
                "   Location: DIAT, Pune, Maharashtra\n"
                "   - Designed and quantized (FP32 to INT8) a lightweight YOLOv8n architecture, "
                "achieving 45 FPS on NVIDIA Jetson Orin (2048 CUDA cores) and 13 FPS on Xilinx FPGA "
                "for edge deployment.\n"
                "   - Integrated a LLaMA 1B model to generate contextual natural-language descriptions "
                "of detected objects in real time.\n\n"
                "2. Focal-CBAM Fish-YOLO — Funded by Ministry of Earth Sciences (MoES), Govt. of India\n"
                "   Period: August 2025 to October 2025\n"
                "   Location: DIAT, Pune, Maharashtra\n"
                "   - Developed an attention-enhanced YOLOv8 detection architecture using a novel "
                "Focal-CBAM module to improve feature attention and accuracy in noisy underwater environments.\n"
                "   - Optimized multi-scale detection heads on the RUOD dataset, outperforming baseline "
                "architectures on underwater localization benchmarks.\n\n"
                "Publications:\n"
                "- 'Deep Underwater Fish Detection via Focal Modulated Channel Attention in YOLO' — "
                "1st Author, ICASA 2026 Conference, London\n"
                "- 'ANIMA: YOLOv8-Based Framework for Object Detection & Compression' — "
                "2nd Author, IEEE Xplore"
            ),
        },
    ]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate 1024-dim embeddings via OpenRouter (same as live retriever)."""
    logger.info(f"Generating {len(texts)} embeddings via OpenRouter (openai/text-embedding-3-small)...")
    response = httpx.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "input": texts,
            "model": "openai/text-embedding-3-small",
            "dimensions": 1024,
        },
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json()["data"]
    data.sort(key=lambda x: x["index"])
    return [d["embedding"] for d in data]


def ingest_resume():
    logger.info("=== Starting Dilip Resume PDF Ingestion into Pinecone ===")

    # 1. Verify PDF exists
    pdf_path = Path(PDF_PATH)
    if not pdf_path.exists():
        logger.error(f"PDF not found at: {PDF_PATH}")
        return

    # 2. Connect to Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)
    logger.info(f"Connected to Pinecone index: '{settings.pinecone_index_name}'")

    # 3. Extract raw text (for logging)
    full_text = extract_pdf_text(str(pdf_path))
    logger.info(f"Extracted {len(full_text)} chars from PDF ({len(full_text.split())} words)")

    # 4. Build semantic chunks
    chunks = build_chunks()
    logger.info(f"Built {len(chunks)} semantic resume chunks")

    # 5. Embed all chunks
    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    # 6. Build Pinecone vectors
    vectors = []
    for chunk, emb in zip(chunks, embeddings):
        vectors.append({
            "id": f"{chunk['doc_id']}_chunk_0",
            "values": emb,
            "metadata": {
                "doc_id": chunk["doc_id"],
                "source_type": "resume",
                "timestamp": "2026-09-06",
                "author": "Dilip Bhakadiwal",
                "chunk_index": 0,
                "chunk_text": chunk["content"][:1500],
            },
        })

    # 7. Upsert to Pinecone
    logger.info(f"Upserting {len(vectors)} resume vectors into Pinecone...")
    result = index.upsert(vectors=vectors)
    logger.info(f"Upsert result: {result}")

    # 8. Verify final count
    time.sleep(2)
    stats = index.describe_index_stats()
    logger.info(f"Pinecone index now has {stats.total_vector_count} total vectors")
    logger.info("=== Resume ingestion COMPLETE ===")

    # 9. Print summary
    print("\n✅ Ingested chunks:")
    for c in chunks:
        print(f"  - {c['doc_id']:40} ({len(c['content'])} chars)")


if __name__ == "__main__":
    ingest_resume()
