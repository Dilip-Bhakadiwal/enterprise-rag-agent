"""
app/config.py
─────────────
Central configuration for the Enterprise RAG demo.
All settings are loaded from environment variables (via .env file).
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM Providers ──────────────────────────────────────────────────────
    openrouter_api_key: str = Field(..., alias="OPENROUTER_API_KEY")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    nvidia_api_key: str = Field(..., alias="NVIDIA_API_KEY")

    primary_model: str = Field(
        default="meta-llama/llama-3.3-70b-instruct",
        alias="PRIMARY_MODEL",
    )
    groq_model: str = Field(
        default="openai/gpt-oss-120b",
        alias="GROQ_MODEL",
    )
    fallback_model: str = Field(
        default="nvidia/llama-3.3-nemotron-super-49b-v1",
        alias="FALLBACK_MODEL",
    )
    primary_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        alias="PRIMARY_BASE_URL",
    )
    groq_base_url: str = Field(
        default="https://api.groq.com/openai/v1",
        alias="GROQ_BASE_URL",
    )
    fallback_base_url: str = Field(
        default="https://integrate.api.nvidia.com/v1",
        alias="FALLBACK_BASE_URL",
    )

    # ── Pinecone ───────────────────────────────────────────────────────────
    pinecone_api_key: str = Field(..., alias="PINECONE_API_KEY")
    pinecone_index_name: str = Field(
        default="enterprise-rag-demo", alias="PINECONE_INDEX_NAME"
    )
    pinecone_cloud: str = Field(default="aws", alias="PINECONE_CLOUD")
    pinecone_region: str = Field(default="us-east-1", alias="PINECONE_REGION")

    # ── Neo4j AuraDB (Knowledge Graph) ─────────────────────────────────────
    neo4j_uri: str = Field(default="neo4j+s://f2c03d7b.databases.neo4j.io", alias="NEO4J_URI")
    neo4j_username: str = Field(default="neo4j", alias="NEO4J_USERNAME")
    neo4j_password: str = Field(default="", alias="NEO4J_PASSWORD")

    # ── Serverless Cache (Upstash Redis) ───────────────────────────────────
    upstash_redis_rest_url: str = Field(default="", alias="UPSTASH_REDIS_REST_URL")
    upstash_redis_rest_token: str = Field(default="", alias="UPSTASH_REDIS_REST_TOKEN")

    # ── Dataset ────────────────────────────────────────────────────────────
    dataset_docs_path: str = Field(
        default="Dataset/documents/test.parquet", alias="DATASET_DOCS_PATH"
    )
    dataset_questions_path: str = Field(
        default="Dataset/questins/test (1).parquet",
        alias="DATASET_QUESTIONS_PATH",
    )

    # ── Ingestion ──────────────────────────────────────────────────────────
    embedding_provider: str = Field(default="nvidia", alias="EMBEDDING_PROVIDER")
    nvidia_embedding_model: str = Field(default="nvidia/nv-embedqa-e5-v5", alias="NVIDIA_EMBEDDING_MODEL")

    chunk_size: int = Field(default=500, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=50, alias="CHUNK_OVERLAP")
    upsert_batch_size: int = Field(default=100, alias="UPSERT_BATCH_SIZE")
    max_docs: int = Field(default=20000, alias="MAX_DOCS")

    # ── App ────────────────────────────────────────────────────────────────
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # ── Eval ───────────────────────────────────────────────────────────────
    ragas_eval_delay_seconds: float = Field(
        default=3.0, alias="RAGAS_EVAL_DELAY_SECONDS"
    )
    ragas_score_threshold: float = Field(
        default=0.6, alias="RAGAS_SCORE_THRESHOLD"
    )

    @property
    def embedding_model(self) -> str:
        """Embedding model name based on provider."""
        if self.embedding_provider == "nvidia":
            return self.nvidia_embedding_model
        return "BAAI/bge-large-en-v1.5"

    @property
    def embedding_dimension(self) -> int:
        """Dimension of embeddings (both bge-large and nv-embedqa-e5-v5 use 1024)."""
        return 1024

    @property
    def top_k_retrieve(self) -> int:
        """How many chunks to retrieve from Pinecone."""
        return 10

    @property
    def top_k_rerank(self) -> int:
        """How many chunks to pass to synthesizer after reranking."""
        return 5

    @property
    def dataset_docs_abspath(self) -> Path:
        """Resolve dataset path relative to project root."""
        return Path(self.dataset_docs_path).resolve()

    @property
    def dataset_questions_abspath(self) -> Path:
        """Resolve questions path relative to project root."""
        return Path(self.dataset_questions_path).resolve()


# Singleton — import this everywhere
settings = Settings()
