# ════════════════════════════════════════════════════════════════════════════
# Enterprise RAG Demo — Dockerfile
# ════════════════════════════════════════════════════════════════════════════
# Build: docker build -t enterprise-rag .
# Run:   docker run -p 7860:7860 --env-file .env enterprise-rag
#
# Key design decisions:
#   - Bakes FastEmbed model (~1.3GB) at BUILD time to prevent HF cold-start kill
#   - Uses python:3.11-slim for minimal image size
#   - Exposes port 7860 (required by Hugging Face Spaces Docker runtime)
#   - Runs as non-root user for security
# ════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# ── System dependencies ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Create non-root user ─────────────────────────────────────────────────
RUN useradd -m -u 1000 appuser

# ── Working directory ────────────────────────────────────────────────────
WORKDIR /app

# ── Install Python dependencies ──────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Bake FastEmbed model at BUILD time ───────────────────────────────────
# CRITICAL: This prevents the ~1.3GB model download from happening at
# container startup, which would cause HF Spaces to kill the container
# during the health-check timeout window.
# (Commented out because we are using NVIDIA NIM API by default to save RAM/Disk)
# RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-large-en-v1.5'); print('FastEmbed model cached successfully')"

# ── Copy application code ─────────────────────────────────────────────────
COPY app/ ./app/
COPY frontend/ ./frontend/
COPY eval/ ./eval/

# ── Set correct ownership ─────────────────────────────────────────────────
RUN chown -R appuser:appuser /app

# ── Switch to non-root user ───────────────────────────────────────────────
USER appuser

# ── Expose port (HF Spaces requires 7860) ────────────────────────────────
EXPOSE 7860

# ── Environment defaults (override with --env-file or HF Space secrets) ──
ENV APP_PORT=7860
ENV APP_HOST=0.0.0.0
ENV LOG_LEVEL=INFO

# ── Health check ──────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# ── Start server ──────────────────────────────────────────────────────────
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --log-level info"]
