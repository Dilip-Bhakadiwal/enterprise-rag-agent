"""
scripts/ingest_portfolio.py
────────────────────────────
Embeds and upserts Dilip Bhakadiwal's complete, detailed portfolio knowledge
documents (including Education from DIAT and MBM University, research, projects,
skills, and experience) into the existing Pinecone vector index.

Uses NVIDIA NIM Embedding model (nvidia/nv-embedqa-e5-v5, 1024-dim).
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from loguru import logger
from pinecone import Pinecone

from app.config import settings

PORTFOLIO_DOCS = [
    {
        "doc_id": "portfolio_dilip_bio",
        "title": "Dilip Bhakadiwal — Biography, Philosophy & Overview",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Dilip Bhakadiwal is an AI & Backend Engineer specializing in Agentic AI, large language model (LLM) orchestration, "
            "and scalable backend cloud infrastructure.\n\n"
            "Academic Credentials:\n"
            "- M.Tech in Artificial Intelligence from Defence Institute of Advanced Technology (DIAT, DRDO), Pune (2024–2026, CGPA: 7.33).\n"
            "- Bachelor of Engineering (B.E. / B.Tech) in Electronics and Computer Engineering from MBM University, Jodhpur, Rajasthan (2019–2023).\n\n"
            "Key Engineering Focuses:\n"
            "- Agentic Workflow Orchestration: Designing multi-agent collaborative graphs with cyclic state handling via LangGraph.\n"
            "- High-Performance Backends: Developing resilient, asynchronous REST, WebSocket, and SSE microservices using FastAPI, Redis, and Python 3.11+.\n"
            "- Enterprise RAG Systems: Engineering sub-second hybrid retrieval pipelines with vector databases (Pinecone, Qdrant, BM25) and contextual rerankers.\n"
            "- Edge AI & Model Optimization: Quantization (FP32 to INT8), TensorRT, ONNX Runtime, and low-latency inference on FPGA and NVIDIA Jetson Orin."
        )
    },
    {
        "doc_id": "portfolio_education",
        "title": "Dilip Bhakadiwal — Education (DIAT Pune & MBM University Jodhpur)",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Dilip Bhakadiwal's Formal Educational Background:\n\n"
            "1. Master of Technology (M.Tech) in Artificial Intelligence (2024 – 2026):\n"
            "   - Institution: Defence Institute of Advanced Technology (DIAT, DRDO), Pune, Maharashtra, India.\n"
            "   - Specialization: Artificial Intelligence, Deep Learning, Spatio-Temporal Models, Agentic Architectures.\n"
            "   - Academic Record: CGPA: 7.33.\n\n"
            "2. Bachelor of Engineering (B.E. / B.Tech) in Electronics and Computer Engineering (2019 – 2023):\n"
            "   - Institution / College: MBM University (MBM Engineering College), Jodhpur, Rajasthan, India.\n"
            "   - Degree: Bachelor of Engineering / B.Tech in Electronics & Computer Engineering (ECE).\n"
            "   - Focus: Computer science foundations, electronics, microprocessors, digital signal processing, algorithms, and software engineering."
        )
    },
    {
        "doc_id": "portfolio_ieee_research",
        "title": "Published Research: IEEE Xplore & ICASA (MoES Funded)",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Dilip Bhakadiwal is a published researcher with peer-reviewed work indexed on IEEE Xplore and ICASA:\n\n"
            "1. Focal-CBAM Fish-YOLO (Funded by Ministry of Earth Sciences, MoES, Govt. of India):\n"
            "   - Developed an attention-enhanced YOLOv8 detection architecture using a novel Focal-CBAM module to improve feature attention in underwater environments.\n"
            "   - Evaluated on RUOD underwater object detection dataset, outperforming baseline YOLO architectures under low-visibility and noisy conditions.\n"
            "   - Manuscript accepted at the ICASA 2025 Conference (International Conference on Applied Sciences and Automation).\n\n"
            "2. Edge AI Object Detection System on FPGA and Jetson Platforms (DIAT Pune):\n"
            "   - Custom lightweight YOLOv8n optimized for embedded edge deployment; quantized from FP32 to INT8.\n"
            "   - Deployed on Xilinx FPGA accelerator (13 FPS) and NVIDIA Jetson Orin with 2048 CUDA cores (45 FPS).\n"
            "   - Integrated lightweight LLaMA 1B model to generate contextual natural-language descriptions of detected objects in real time."
        )
    },
    {
        "doc_id": "portfolio_marketpulse",
        "title": "MarketPulse AI — Real-Time Agentic Financial Terminal",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "MarketPulse AI is a flagship production-grade agentic financial intelligence terminal engineered by Dilip:\n"
            "- Architecture: Multi-agent graph orchestrated via LangGraph with state persistence and backpressure handling.\n"
            "- Streaming Data Engine: FastAPI async WebSocket and Server-Sent Events (SSE) token-streaming digesting live ticker feeds, order book depth, and macroeconomic sentiment.\n"
            "- Database & Analytics: Aiven Managed PostgreSQL handling algorithmic SQL synthesis (Z-score anomaly detection) and AST-level SQL security guardrails.\n"
            "- Agent Roles: Specialized worker agents for Technical Analysis (RSI, MACD, Bollinger Bands), Fundamental Valuation, and News Sentiment extraction.\n"
            "- Latency & Resilience: Sub-200ms agent decision cycle with automated 3-path cloud price fallbacks and strict Pydantic v2 validation."
        )
    },
    {
        "doc_id": "portfolio_redwood",
        "title": "Redwood Inference & Enterprise RAG Pipeline",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Redwood Inference is an enterprise-grade retrieval-augmented generation engine engineered by Dilip:\n"
            "- Vector Storage: Pinecone Serverless & Qdrant with hybrid dense embeddings + BM25 sparse keyword ranking.\n"
            "- Advanced RAG Mechanics: Query decomposition (multi-hop), parent-child chunk linking, sliding window context packing, and Cross-Encoder reranking reducing hallucinations by 64%.\n"
            "- Evaluation & Quality: Continuous evaluation gated by sequential Ragas metrics (Faithfulness, Answer Relevance, Context Recall).\n"
            "- Infrastructure: Containerized on Docker, automated CI/CD via GitHub Actions to AWS (ECS Fargate, Lambda, API Gateway) and Render, monitored with OpenTelemetry.\n"
            "- Throughput: Sustains 500+ QPS with p95 latency under 180ms."
        )
    },
    {
        "doc_id": "portfolio_stack",
        "title": "Core Technical Stack & Engineering Competencies",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Dilip's Technical Arsenal & Competencies:\n"
            "- Agentic AI & Orchestration: LangGraph, LangChain, Model Context Protocol (MCP), ReAct Agent Workflows, LlamaIndex, Ollama, vLLM, Prompt Engineering.\n"
            "- Backend & Cloud Pipelines: FastAPI, Python 3.11+, AsyncIO, WebSockets, SSE, Pydantic v2, Celery, Redis, Express, TypeScript, Docker, Render, AWS (ECS, App Runner, S3, CloudFront), GitHub Actions CI/CD.\n"
            "- Data Processing & Retrieval: Pinecone Serverless, PostgreSQL (Aiven), FastEmbed, GraphRAG, Neo4j, Hybrid Dense/Sparse Search, Cross-Encoders.\n"
            "- LLM Integration & Evals: OpenRouter APIs, NVIDIA NIM APIs, Groq, Pytest, LLM Evals, LangSmith, Ragas benchmark evaluation.\n"
            "- Machine Learning & Tools: PyTorch, HuggingFace Transformers, ONNX Runtime, TensorRT, Model Quantization (GGUF/AWQ/INT8), Git, Pandas, NumPy, Scikit-learn."
        )
    },
    {
        "doc_id": "portfolio_resume_contact",
        "title": "Contact Information, Resume & Profiles",
        "source_type": "portfolio",
        "author": "Dilip Bhakadiwal",
        "timestamp": "2026-08-22",
        "content": (
            "Dilip Bhakadiwal Contact Information & Social Profiles:\n"
            "- Location: Pune, Maharashtra, India\n"
            "- Phone: +91-8003046831\n"
            "- Email: 9828dilip@gmail.com\n"
            "- LinkedIn: https://linkedin.com/in/dilip-bhakadiwal\n"
            "- GitHub: https://github.com/Dilip-Bhakadiwal and https://github.com/Dilip-Bhakadiwal/AI-Projects\n"
            "- Degrees: M.Tech in AI from DIAT Pune (2024-2026), B.Tech / B.E. in Electronics & Computer Engineering from MBM University, Jodhpur (2019-2023)."
        )
    }
]


def ingest_portfolio():
    logger.info("Starting ingestion of Dilip Bhakadiwal's Full Portfolio Knowledge (including MBM & DIAT) into Pinecone...")

    # 1. Connect to Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)
    logger.info(f"Connected to Pinecone index: '{settings.pinecone_index_name}'")

    # 2. Prepare texts for embedding
    texts = [doc["content"] for doc in PORTFOLIO_DOCS]

    # 3. Generate 1024-dim embeddings via NVIDIA NIM
    logger.info(f"Generating embeddings via NVIDIA NIM: {settings.embedding_model}...")
    response = httpx.post(
        "https://integrate.api.nvidia.com/v1/embeddings",
        headers={
            "Authorization": f"Bearer {settings.nvidia_api_key}",
            "Content-Type": "application/json"
        },
        json={
            "input": texts,
            "model": settings.embedding_model,
            "input_type": "passage",
            "truncate": "END"
        },
        timeout=60.0
    )
    response.raise_for_status()
    data = response.json()["data"]
    data.sort(key=lambda x: x["index"])
    embeddings = [d["embedding"] for d in data]

    # 4. Construct Pinecone vector payloads
    vectors = []
    for doc, emb in zip(PORTFOLIO_DOCS, embeddings):
        vectors.append({
            "id": f"{doc['doc_id']}_chunk_0",
            "values": emb,
            "metadata": {
                "doc_id": doc["doc_id"],
                "source_type": doc["source_type"],
                "timestamp": doc["timestamp"],
                "author": doc["author"],
                "chunk_index": 0,
                "chunk_text": doc["content"][:1000]
            }
        })

    # 5. Upsert into Pinecone
    logger.info(f"Upserting {len(vectors)} portfolio vectors into Pinecone...")
    upsert_res = index.upsert(vectors=vectors)
    logger.info(f"Upsert completed successfully! Result: {upsert_res}")

    # 6. Verify index stats
    time.sleep(2)
    stats = index.describe_index_stats()
    logger.info(f"Updated Pinecone index stats: total_vector_count={stats.total_vector_count}")


if __name__ == "__main__":
    ingest_portfolio()
