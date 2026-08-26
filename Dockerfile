# ════════════════════════════════════════════════════════════════════════════
# Enterprise RAG — Unified Dockerfile
# ════════════════════════════════════════════════════════════════════════════
# ONE container, ONE command, serves BOTH:
#   - React frontend (built at image build time → react-frontend/dist)
#   - FastAPI backend  (uvicorn, port 10000 for Render)
#
# Build:  docker build -t enterprise-rag .
# Run:    docker run -p 10000:10000 --env-file .env enterprise-rag
# ════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Copy only package files first for layer caching
COPY react-frontend/package*.json ./

# Install npm deps
RUN npm install

# Copy the rest of the frontend source
COPY react-frontend/ ./

# Build the production React bundle → dist/
RUN npm run build


# ── Stage 2: Python FastAPI backend ──────────────────────────────────────────
FROM python:3.11-slim

# ── System dependencies ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ─────────────────────────────────────────────────────────
RUN useradd -m -u 1000 appuser

# ── Working directory ─────────────────────────────────────────────────────
WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy FastAPI app code ─────────────────────────────────────────────────────
COPY app/ ./app/

# ── Copy built React frontend from Stage 1 ────────────────────────────────
# FastAPI serves this as static files from /react-frontend/dist
COPY --from=frontend-builder /frontend/dist ./react-frontend/dist

# ── Ownership ─────────────────────────────────────────────────────────────
RUN chown -R appuser:appuser /app

USER appuser

# ── Render uses port 10000 by default ────────────────────────────────────
EXPOSE 10000

# ── Environment defaults ──────────────────────────────────────────────────
ENV APP_PORT=10000
ENV APP_HOST=0.0.0.0
ENV LOG_LEVEL=INFO

# ── Health check ──────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

# ── ONE command starts everything ─────────────────────────────────────────
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --log-level info"]
