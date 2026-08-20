"""
app/ingestion/load_dataset.py
─────────────────────────────
Loads the local EnterpriseRAG-Bench parquet files and returns
a cleaned, normalized list of document dicts.

Each document dict has:
    {
        "doc_id":      str,   # unique identifier
        "source_type": str,   # slack | gmail | github | jira | confluence | …
        "timestamp":   str,   # ISO-8601 string or empty
        "author":      str,   # author name or empty
        "text":        str,   # full document text (raw)
    }
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd
from loguru import logger

from app.config import settings


# ── Source type normalisation map ──────────────────────────────────────────
# Keys: possible column values → canonical lowercase name used in metadata
_SOURCE_NORMALISE: dict[str, str] = {
    "slack": "slack",
    "email": "gmail",
    "gmail": "gmail",
    "github": "github",
    "gh": "github",
    "jira": "jira",
    "confluence": "confluence",
    "notion": "notion",
    "drive": "google_drive",
    "google_drive": "google_drive",
    "gdrive": "google_drive",
    "onedrive": "onedrive",
    "sharepoint": "sharepoint",
    "teams": "teams",
    "discord": "discord",
}


def _normalise_source(raw: Any) -> str:
    """Convert raw source_type value to a canonical lowercase string."""
    if not raw or (isinstance(raw, float)):  # NaN check
        return "unknown"
    s = str(raw).strip().lower()
    return _SOURCE_NORMALISE.get(s, s)


def _safe_str(val: Any) -> str:
    """Convert a value to string, returning '' for null/NaN."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    return str(val).strip()


def _detect_columns(df: pd.DataFrame) -> dict[str, str | None]:
    """
    Heuristically detect which columns hold doc_id, text, source, timestamp, author.
    The EnterpriseRAG-Bench parquet may have slightly different column names
    depending on the split version.
    """
    cols = {c.lower(): c for c in df.columns}

    def _pick(*candidates: str) -> str | None:
        for c in candidates:
            if c in cols:
                return cols[c]
        return None

    return {
        "doc_id": _pick("doc_id", "id", "document_id", "docid"),
        "text": _pick(
            "content", "text", "body", "document", "chunk_text",
            "message", "description", "answer"
        ),
        "source_type": _pick(
            "source_type", "source", "platform", "type", "channel_type"
        ),
        "timestamp": _pick(
            "timestamp", "created_at", "date", "time", "sent_at", "updated_at"
        ),
        "author": _pick(
            "author", "sender", "user", "from", "username", "creator"
        ),
    }


def load_documents(
    path: Path | str | None = None,
    max_docs: int | None = None,
    seed_doc_ids: list[str] | None = None,
) -> list[dict]:
    """
    Load documents from the local parquet file.

    Args:
        path:          Override default path from settings.
        max_docs:      Maximum total documents to return (including seeded ones).
        seed_doc_ids:  doc_ids that MUST be included regardless of sampling.

    Returns:
        List of normalised document dicts.
    """
    file_path = Path(path or settings.dataset_docs_path).resolve()
    max_docs = max_docs or settings.max_docs

    logger.info(f"Loading documents from: {file_path}")

    if not file_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {file_path}. "
            "Check DATASET_DOCS_PATH in your .env file."
        )

    df = pd.read_parquet(file_path)
    logger.info(f"Loaded {len(df):,} rows. Columns: {list(df.columns)}")

    col_map = _detect_columns(df)
    logger.debug(f"Column mapping: {col_map}")

    # ── Vectorised document building (no row-by-row Python loop) ─────────
    text_col = col_map["text"]
    id_col   = col_map["doc_id"]
    src_col  = col_map["source_type"]
    ts_col   = col_map["timestamp"]
    auth_col = col_map["author"]

    df["_text"] = (df[text_col].fillna("").astype(str).str.strip()
                   if text_col else "")
    df["_doc_id"] = (df[id_col].fillna("").astype(str).str.strip()
                     if id_col else df.index.astype(str).map(lambda i: f"doc_{i}"))
    df["_source_type"] = (df[src_col].fillna("").astype(str).apply(_normalise_source)
                          if src_col else "unknown")
    df["_timestamp"] = (df[ts_col].fillna("").astype(str).str.strip()
                        if ts_col else "")
    df["_author"] = (df[auth_col].fillna("").astype(str).str.strip()
                     if auth_col else "")

    # Blank doc_ids → row-index fallback
    blank_mask = df["_doc_id"] == ""
    df.loc[blank_mask, "_doc_id"] = "doc_" + df[blank_mask].index.astype(str)

    # Filter empty texts (vectorised)
    df = df[df["_text"].str.len() >= 20].copy()
    logger.info(f"After text filtering: {len(df):,} valid documents")

    # ── Seed-first sampling ────────────────────────────────────────────────
    if seed_doc_ids:
        seed_set = set(seed_doc_ids)
        seeded_df = df[df["_doc_id"].isin(seed_set)]
        remainder_df = df[~df["_doc_id"].isin(seed_set)]

        missing = seed_set - set(seeded_df["_doc_id"].tolist())
        if missing:
            logger.warning(f"Could not find seeded doc_ids: {missing}")

        remaining_quota = max(0, max_docs - len(seeded_df))
        if len(remainder_df) > remaining_quota:
            remainder_df = remainder_df.sample(n=remaining_quota, random_state=42)

        final_df = pd.concat([seeded_df, remainder_df], ignore_index=True)
        logger.info(
            f"Seeded {len(seeded_df)} mandatory docs + {len(remainder_df)} random docs "
            f"= {len(final_df):,} total"
        )
    else:
        if len(df) > max_docs:
            df = df.sample(n=max_docs, random_state=42)
        final_df = df
        logger.info(f"Sampled {len(final_df):,} documents (no seeds)")

    # ── Convert to list of dicts ───────────────────────────────────────────
    final = final_df[["_doc_id", "_source_type", "_timestamp", "_author", "_text"]].rename(
        columns={
            "_doc_id": "doc_id",
            "_source_type": "source_type",
            "_timestamp": "timestamp",
            "_author": "author",
            "_text": "text",
        }
    ).to_dict(orient="records")

    return final


def load_questions(path: Path | str | None = None) -> list[dict]:
    """
    Load the questions/eval parquet.

    Returns:
        List of dicts with at minimum {"question": str, "answer": str}.
    """
    file_path = Path(path or settings.dataset_questions_path).resolve()
    logger.info(f"Loading questions from: {file_path}")

    if not file_path.exists():
        raise FileNotFoundError(f"Questions file not found at {file_path}")

    df = pd.read_parquet(file_path)
    logger.info(f"Loaded {len(df):,} question rows. Columns: {list(df.columns)}")

    cols = {c.lower(): c for c in df.columns}

    def _pick(*candidates: str) -> str | None:
        for c in candidates:
            if c in cols:
                return cols[c]
        return None

    q_col  = _pick("question", "query", "input", "q")
    a_col  = _pick("gold_answer", "answer", "ground_truth", "reference", "expected", "output")
    id_col = _pick("expected_doc_ids", "doc_id", "document_id", "id", "source_doc_id")
    type_col = _pick("question_type", "type", "category", "intent")
    src_col  = _pick("source_types", "source_type", "platform", "source")

    questions = []
    for idx, row in df.iterrows():
        question = _safe_str(row.get(q_col, "")) if q_col else ""
        answer   = _safe_str(row.get(a_col, "")) if a_col else ""
        raw_ids = row.get(id_col, "") if id_col else ""
        extracted_ids = re.findall(r"dsid_[a-f0-9]+|doc_\d+", str(raw_ids))
        doc_id = ", ".join(extracted_ids) if extracted_ids else _safe_str(raw_ids)

        q_type  = _safe_str(row.get(type_col, "")) if type_col else ""
        sources = _safe_str(row.get(src_col, "")) if src_col else ""

        if not question:
            continue

        questions.append(
            {
                "question":      question,
                "ground_truth":  answer,
                "source_doc_id": doc_id,
                "question_type": q_type,
                "source_types":  sources,
            }
        )

    logger.info(f"Loaded {len(questions):,} valid questions")
    return questions
