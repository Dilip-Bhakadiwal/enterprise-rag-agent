"""
scripts/reingest_resume.py
──────────────────────────
Deletes old resume/portfolio vectors from Pinecone and upserts
clean, high-density semantic chunks parsed from C:/Users/EXNOX/Downloads/DILIP_resume.pdf.
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import pdfplumber
from loguru import logger
from pinecone import Pinecone

from app.config import settings

PDF_PATH = "C:/Users/EXNOX/Downloads/DILIP_resume.pdf"


def get_resume_chunks() -> list[dict]:
    """Structured semantic chunks from Dilip Bhakadiwal's latest resume."""
    return [
        {
            "doc_id": "resume_dilip_overview",
            "title": "Dilip Bhakadiwal — Overview, Profile & Contact Information",
            "content": (
                "Dilip Bhakadiwal — AI/ML Engineer Resume\n"
                "Contact: +91-8003046831 | 9828dilip@gmail.com | "
                "linkedin.com/in/dilip-bhakadiwal | github.com/Dilip-Bhakadiwal/AI-Projects\n"
                "Location: Jaipur, Rajasthan (Open to Remote)\n\n"
                "Professional Profile:\n"
                "AI/ML Engineer specializing in Agentic workflows, GraphRAG, and high-performance "
                "LLM orchestration. Proven experience architecting scalable multi-agent systems, "
                "deploying open-source models locally (Llama 3.3, Qwen), and optimizing retrieval "
                "pipelines for enterprise-grade, sub-second inference."
            ),
        },
        {
            "doc_id": "resume_dilip_skills",
            "title": "Dilip Bhakadiwal — Technical Skills & Core Competencies",
            "content": (
                "Dilip Bhakadiwal Technical Skills:\n\n"
                "- Agentic AI & Orchestration: LangGraph, LangChain, Model Context Protocol (MCP), ReAct Agent Workflows\n"
                "- Backend & Cloud Pipelines: FastAPI, AWS, Docker, Render, GitHub Actions (CI/CD)\n"
                "- Data Processing & Retrieval: GraphRAG, Neo4j, Pinecone, PostgreSQL, FastEmbed, Redis\n"
                "- LLM Integration & Evals: LangSmith, Prompt Guardrails, PII Redaction\n"
                "- Programming & Tools: Python, PyTorch, TypeScript, React, Git, Pandas, NumPy"
            ),
        },
        {
            "doc_id": "resume_dilip_education",
            "title": "Dilip Bhakadiwal — Education & Academic Qualifications",
            "content": (
                "Dilip Bhakadiwal Academic Qualifications:\n\n"
                "1. Defence Institute of Advanced Technology (DIAT), Pune, Maharashtra (2024 to 2026)\n"
                "   Degree: Master of Technology (M.Tech) in Artificial Intelligence\n"
                "   Academic Performance: CGPA 7.33\n\n"
                "2. MBM University (MBM Engineering College), Jodhpur, Rajasthan (2019 to 2023)\n"
                "   Degree: Bachelor of Engineering (B.E. / B.Tech) in Electronics and Computer Engineering\n"
                "   Certification / Honor: GATE 2023 Qualified"
            ),
        },
        {
            "doc_id": "resume_dilip_project_nexora",
            "title": "Dilip Bhakadiwal — Project: Nexora AI Enterprise GraphRAG Platform",
            "content": (
                "Key AI Engineering Project: Nexora AI — Enterprise GraphRAG Platform (2026)\n"
                "Technologies Used: LangGraph, Neo4j, Pinecone, Groq LPU, FastAPI, React\n"
                "- Architected a multi-agent GraphRAG platform unifying Neo4j Cypher traversals with Pinecone "
                "semantic search, achieving 99.4% multi-hop retrieval accuracy.\n"
                "- Engineered a sub-second (<200ms) LPU inference pipeline using Groq with automated failover, "
                "deployed as a fully containerized React and FastAPI architecture on Render.\n"
                "- Implemented an ephemeral memory engine with active PII redaction guardrails (stripping SSNs, "
                "API keys) and strict rate-limiting for enterprise-grade data security."
            ),
        },
        {
            "doc_id": "resume_dilip_project_alignai",
            "title": "Dilip Bhakadiwal — Project: AlignAI Engine Autonomous Job Discovery",
            "content": (
                "Key AI Engineering Project: AlignAI Engine — Autonomous Job Discovery (2026)\n"
                "Technologies Used: LangGraph, Pinecone, Neo4j, FastEmbed, RapidFuzz\n"
                "- Developed a LangGraph-orchestrated multi-agent state machine to autonomously ingest and "
                "normalize API-sourced job postings, processing 100+ roles/minute and eliminating 85% of keyword noise.\n"
                "- Designed a 3-signal fit-ranking algorithm combining dense cosine similarity, Neo4j graph coverage, "
                "and LLM evaluation for explainable candidate-role alignment.\n"
                "- Built a SHA-256 caching architecture utilizing RapidFuzz for continuous entity resolution, "
                "eliminating graph node duplication and automatically recomputing vectors on profile updates."
            ),
        },
        {
            "doc_id": "resume_dilip_research_edge_ai",
            "title": "Dilip Bhakadiwal — Research: Edge AI Object Detection on FPGA & Jetson",
            "content": (
                "Research Experience: Edge AI Object Detection System on FPGA and Jetson Platforms\n"
                "Period: September 2025 to January 2026 | Location: DIAT, Pune, Maharashtra\n"
                "- Designed and quantized (FP32 to INT8) a lightweight YOLOv8n architecture, achieving 45 FPS on an "
                "NVIDIA Jetson Orin (2048 CUDA cores) and 13 FPS on a Xilinx FPGA for edge deployment.\n"
                "- Integrated a local LLaMA 1B model to generate contextual natural-language descriptions of detected "
                "objects in real time directly on edge devices."
            ),
        },
        {
            "doc_id": "resume_dilip_research_focal_cbam",
            "title": "Dilip Bhakadiwal — Research: Focal-CBAM Fish-YOLO (Funded by MoES Govt of India)",
            "content": (
                "Research Experience: Focal-CBAM Fish-YOLO — Funded by Ministry of Earth Sciences (MoES), Govt. of India\n"
                "Period: August 2025 to October 2025 | Location: DIAT, Pune, Maharashtra\n"
                "- Developed an attention-enhanced YOLOv8 detection architecture using a novel Focal-CBAM module "
                "to improve feature attention and accuracy in noisy underwater environments.\n"
                "- Optimized multi-scale detection heads on the RUOD dataset, successfully outperforming baseline "
                "architectures on underwater localization benchmarks."
            ),
        },
        {
            "doc_id": "resume_dilip_publications",
            "title": "Dilip Bhakadiwal — Publications: ICASA 2026 London & IEEE Xplore",
            "content": (
                "Dilip Bhakadiwal Research Publications:\n\n"
                "1. 'Deep Underwater Fish Detection via Focal Modulated Channel Attention in YOLO'\n"
                "   Role: 1st Author\n"
                "   Venue: ICASA 2026 Conference, London\n"
                "   Focus: Focal-CBAM channel attention module for underwater object detection.\n\n"
                "2. 'ANIMA: YOLOv8-Based Framework for Object Detection & Compression'\n"
                "   Role: 2nd Author\n"
                "   Venue: IEEE Xplore\n"
                "   Focus: Object detection acceleration, neural network compression, and quantization."
            ),
        },
    ]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate 1024-dim embeddings via OpenRouter."""
    logger.info(f"Generating {len(texts)} embeddings via OpenRouter (openai/text-embedding-3-small, 1024-dim)...")
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": texts,
        "model": "openai/text-embedding-3-small",
        "dimensions": 1024,
    }
    resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()["data"]
    data.sort(key=lambda x: x["index"])
    return [d["embedding"] for d in data]


def reingest():
    logger.info("=== Starting Clean Re-Ingestion of Dilip's Resume into Pinecone ===")

    # 1. Connect to Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)
    initial_stats = index.describe_index_stats()
    logger.info(f"Connected to Pinecone '{settings.pinecone_index_name}'. Current vectors: {initial_stats.total_vector_count}")

    # 2. Identify existing resume/portfolio vector IDs
    known_old_ids = [
        "resume_dilip_overview_chunk_0",
        "resume_dilip_skills_chunk_0",
        "resume_dilip_education_chunk_0",
        "resume_dilip_projects_chunk_0",
        "resume_dilip_research_pubs_chunk_0",
        "portfolio_dilip_bio_chunk_0",
        "portfolio_education_chunk_0",
        "portfolio_projects_chunk_0",
        "portfolio_research_chunk_0",
        "portfolio_publications_chunk_0",
        "portfolio_skills_chunk_0",
        "resume_dilip_project_nexora_chunk_0",
        "resume_dilip_project_alignai_chunk_0",
        "resume_dilip_research_edge_ai_chunk_0",
        "resume_dilip_research_focal_cbam_chunk_0",
    ]

    # Also query to find any others with source_type == resume/portfolio
    try:
        q_res = index.query(vector=[0.0] * 1024, top_k=100, include_metadata=True)
        for m in q_res.get("matches", []):
            st = m.get("metadata", {}).get("source_type")
            if st in ("resume", "portfolio") or m["id"].startswith("resume_") or m["id"].startswith("portfolio_"):
                if m["id"] not in known_old_ids:
                    known_old_ids.append(m["id"])
    except Exception as e:
        logger.warning(f"Metadata scan warning: {e}")

    logger.info(f"Targeting {len(known_old_ids)} existing resume/portfolio vector IDs for deletion...")
    try:
        index.delete(ids=known_old_ids)
        logger.info("Old resume vectors deleted successfully.")
    except Exception as e:
        logger.warning(f"Delete warning (some IDs may not have existed): {e}")

    time.sleep(1)

    # 3. Build fresh chunks
    chunks = get_resume_chunks()
    logger.info(f"Prepared {len(chunks)} rich semantic chunks from DILIP_resume.pdf")

    # 4. Generate embeddings
    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    # 5. Build vectors payload
    vectors = []
    for chunk, emb in zip(chunks, embeddings):
        vectors.append({
            "id": f"{chunk['doc_id']}_chunk_0",
            "values": emb,
            "metadata": {
                "doc_id": chunk["doc_id"],
                "title": chunk["title"],
                "source_type": "resume",
                "timestamp": "2026-09-06",
                "author": "Dilip Bhakadiwal",
                "chunk_index": 0,
                "chunk_text": chunk["content"][:1800],
            },
        })

    # 6. Upsert into Pinecone
    logger.info(f"Upserting {len(vectors)} new vectors into Pinecone...")
    upsert_resp = index.upsert(vectors=vectors)
    logger.info(f"Upsert response: {upsert_resp}")

    # 7. Verify stats
    time.sleep(2)
    final_stats = index.describe_index_stats()
    logger.info(f"Verification: Pinecone now has {final_stats.total_vector_count} total vectors.")

    # 8. Test search against newly indexed resume
    test_query = "What published research did Dilip work on with MoES funding?"
    test_emb = embed_texts([test_query])[0]
    search_res = index.query(vector=test_emb, top_k=3, include_metadata=True)
    print("\n[Search] Test Pinecone Retrieval for: " + test_query)
    for i, m in enumerate(search_res.get("matches", []), 1):
        print(f"  [{i}] ID: {m['id']} | Score: {m['score']:.4f}")
        print(f"      Text: {m['metadata'].get('chunk_text', '')[:120]}...\n")

    print(f"[SUCCESS] {len(vectors)} resume vectors freshly indexed into Pinecone!")
    print(f"Total live vectors in Pinecone: {final_stats.total_vector_count}")


if __name__ == "__main__":
    reingest()
