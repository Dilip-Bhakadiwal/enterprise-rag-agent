"""
app/doc_parser.py
─────────────────
Ephemeral multi-format document parser with strict quota guardrails.
Supports:
  - PDF (via LlamaParse REST API with fallback to pypdf, max 5 pages)
  - JSON (native structured formatter, 0 credit cost)
  - Markdown / TXT / CSV (native text reader, 0 credit cost)

Zero-Persistence: Chunks are stored in volatile RAM only, never written to disk or DB.
"""

import io
import json
import os
import re
import time
import httpx
from loguru import logger
from pypdf import PdfReader

from app.config import settings

# Blocked image extensions
_BLOCKED_IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".tiff", ".ico", ".heic"
}

# Allowed document extensions
_ALLOWED_EXTENSIONS = {
    ".pdf", ".json", ".md", ".markdown", ".txt", ".csv"
}


class DocValidationError(Exception):
    """Raised when a document violates size, page count, or format guardrails."""
    pass


def validate_document(file_bytes: bytes, filename: str, content_type: str = "") -> dict:
    """
    Validate uploaded file constraints before any external API calls:
    1. Rejects image formats explicitly.
    2. Enforces max size limit (10MB).
    3. Enforces PDF page limit (<= 5 pages) to strictly protect LlamaParse credits.
    """
    ext = os.path.splitext(filename.lower())[1]

    if ext in _BLOCKED_IMAGE_EXTENSIONS or "image/" in (content_type or ""):
        raise DocValidationError(
            "Image files are not supported. Please upload a PDF, JSON, Markdown (.md), or TXT document."
        )

    if ext not in _ALLOWED_EXTENSIONS:
        raise DocValidationError(
            f"Unsupported file format '{ext}'. Supported formats: PDF, JSON, Markdown (.md), TXT, CSV."
        )

    size_bytes = len(file_bytes)
    if size_bytes > settings.max_doc_size_bytes:
        max_mb = settings.max_doc_size_bytes / (1024 * 1024)
        curr_mb = size_bytes / (1024 * 1024)
        raise DocValidationError(
            f"File size limit exceeded: {curr_mb:.1f}MB (Max allowed: {max_mb:.0f}MB)."
        )

    page_count = 1
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            if page_count > settings.max_doc_pages:
                raise DocValidationError(
                    f"PDF page limit exceeded: Document has {page_count} pages. "
                    f"Maximum allowed is {settings.max_doc_pages} pages per document to conserve parser quota."
                )
        except DocValidationError:
            raise
        except Exception as exc:
            logger.warning(f"Could not read PDF page count with pypdf ({exc}). Proceeding with page_count=1.")

    return {
        "filename": filename,
        "extension": ext,
        "size_bytes": size_bytes,
        "page_count": page_count,
    }


def parse_pdf_pypdf_fallback(file_bytes: bytes) -> str:
    """Fast, zero-credit native PDF text extractor with automatic heading detection."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for idx, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            if not text.strip():
                continue
            cleaned_lines = []
            for line in text.split("\n"):
                sline = line.strip()
                # If all-caps or title-like section heading
                if (
                    re.match(r"^[A-Z0-9\s/&,\-–|]{4,45}$", sline)
                    and not sline.startswith("HTTP")
                    and not re.match(r"^\d+$", sline)
                    and len(sline.split()) <= 6
                ):
                    cleaned_lines.append(f"\n## {sline}\n")
                else:
                    cleaned_lines.append(line)
            pages_text.append("\n".join(cleaned_lines))
        return "\n\n".join(pages_text) if pages_text else "No extractable text found in PDF."
    except Exception as exc:
        logger.error(f"PyPDF extraction error: {exc}")
        return "Failed to extract text from PDF."


def parse_pdf_with_llamaparse(file_bytes: bytes, filename: str) -> tuple[str, str]:
    """
    Parse PDF using LlamaParse REST API for state-of-the-art table and markdown extraction.
    Falls back to PyPDF native extractor if API is unavailable or times out.
    """
    api_key = settings.llamaparse_api_key
    if not api_key:
        logger.info("LlamaParse API key not configured, using PyPDF native parser.")
        return parse_pdf_pypdf_fallback(file_bytes), "pypdf_native"

    upload_url = "https://api.cloud.llamaindex.ai/api/parsing/upload"
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        logger.info(f"Uploading PDF '{filename}' ({len(file_bytes)} bytes) to LlamaParse...")
        files = {"file": (filename, file_bytes, "application/pdf")}
        data = {
            "parsing_instruction": "Extract all headings, text paragraphs, and tabular data formatted as clean Markdown.",
            "language": "en"
        }

        # Step 1: Upload Job with generous timeout
        resp = httpx.post(upload_url, headers=headers, files=files, data=data, timeout=35.0)
        if resp.status_code != 200:
            logger.warning(f"LlamaParse upload returned HTTP {resp.status_code}: {resp.text[:150]}. Using PyPDF fallback.")
            return parse_pdf_pypdf_fallback(file_bytes), "pypdf_fallback"

        job_id = resp.json().get("id")
        if not job_id:
            return parse_pdf_pypdf_fallback(file_bytes), "pypdf_fallback"

        # Step 2: Poll Job Status (Up to 30 seconds)
        status_url = f"https://api.cloud.llamaindex.ai/api/parsing/job/{job_id}"
        t_start = time.perf_counter()
        while time.perf_counter() - t_start < 30.0:
            time.sleep(1.5)
            st_resp = httpx.get(status_url, headers=headers, timeout=10.0)
            if st_resp.status_code == 200:
                st_data = st_resp.json()
                status = st_data.get("status")
                if status == "SUCCESS":
                    # Step 3: Fetch Markdown Result
                    res_url = f"https://api.cloud.llamaindex.ai/api/parsing/job/{job_id}/result/markdown"
                    res_resp = httpx.get(res_url, headers=headers, timeout=15.0)
                    if res_resp.status_code == 200:
                        markdown_text = res_resp.json().get("markdown", "").strip()
                        if markdown_text:
                            logger.info(f"✅ LlamaParse successfully parsed '{filename}' in {time.perf_counter()-t_start:.1f}s")
                            return markdown_text, "llamaparse_ai"
                    break
                elif status in ("ERROR", "CANCELLED"):
                    logger.warning(f"LlamaParse job failed with status: {status}")
                    break

        logger.warning("LlamaParse polling timeout/incomplete. Using PyPDF fallback.")
        return parse_pdf_pypdf_fallback(file_bytes), "pypdf_fallback"

    except Exception as exc:
        logger.warning(f"LlamaParse execution exception: {exc!r}. Using PyPDF fallback.")
        return parse_pdf_pypdf_fallback(file_bytes), "pypdf_fallback"


def parse_json_document(file_bytes: bytes) -> str:
    """Format structured JSON into clean hierarchical markdown at 0 credit cost."""
    try:
        raw_text = file_bytes.decode("utf-8", errors="replace")
        parsed = json.loads(raw_text)

        lines = ["# JSON Data Breakdown\n"]
        if isinstance(parsed, list):
            lines.append(f"**Total Records**: {len(parsed)}\n")
            for idx, item in enumerate(parsed[:40], 1):
                lines.append(f"### Record {idx}")
                if isinstance(item, dict):
                    for k, v in item.items():
                        lines.append(f"- **{k}**: {v}")
                else:
                    lines.append(f"- {item}")
                lines.append("")
        elif isinstance(parsed, dict):
            for k, v in parsed.items():
                if isinstance(v, (dict, list)):
                    lines.append(f"### {k}")
                    lines.append(f"```json\n{json.dumps(v, indent=2)[:800]}\n```\n")
                else:
                    lines.append(f"- **{k}**: {v}")
        else:
            lines.append(f"```\n{parsed}\n```")

        return "\n".join(lines)
    except Exception as exc:
        return f"# Raw JSON Content\n\n```\n{file_bytes.decode('utf-8', errors='replace')[:4000]}\n```"


def parse_markdown_or_txt(file_bytes: bytes) -> str:
    """Read Markdown or TXT files directly at 0 credit cost."""
    return file_bytes.decode("utf-8", errors="replace").strip()


def chunk_document_text(
    full_markdown: str,
    filename: str,
    page_count: int = 1,
    target_chunk_size: int = 600,
    overlap: int = 100
) -> list[dict]:
    """
    Split markdown document into semantic chunks anchored by headers and paragraphs.
    Preserves section context for accurate citations and grounded QA.
    """
    if not full_markdown.strip():
        return []

    # Split by markdown headers or double newlines
    sections = re.split(r"(?=(?:^|\n)#{1,4}\s+)", full_markdown)
    chunks = []
    chunk_idx = 1
    current_heading = "Document Content"

    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue

        # Detect heading
        first_line = sec.split("\n", 1)[0].strip()
        if first_line.startswith("#"):
            current_heading = first_line.lstrip("#").strip()

        # Split section into chunks if too long
        words = sec.split()
        if len(words) <= target_chunk_size:
            chunks.append({
                "chunk_id": f"chunk_{chunk_idx}",
                "text": sec,
                "heading": current_heading,
                "word_count": len(words),
                "filename": filename,
            })
            chunk_idx += 1
        else:
            # Sliding window over long section
            for i in range(0, len(words), target_chunk_size - overlap):
                window_words = words[i:i + target_chunk_size]
                if not window_words:
                    continue
                window_text = " ".join(window_words)
                chunks.append({
                    "chunk_id": f"chunk_{chunk_idx}",
                    "text": window_text,
                    "heading": f"{current_heading} (Part {chunk_idx})",
                    "word_count": len(window_words),
                    "filename": filename,
                })
                chunk_idx += 1

    return chunks


def generate_starter_questions(chunks: list[dict], filename: str) -> list[str]:
    """Generate 3 high-value, guaranteed-answerable starter questions based on extracted content."""
    invalid_headings = {
        "general overview", "overview", "part", "page", "no_content_here",
        "json data breakdown", "raw json content", "record", "header", "introduction"
    }

    valid_headings = []
    for c in chunks:
        h = c.get("heading", "").replace("#", "").strip()
        h_clean = re.sub(r"[\*\_`]", "", h).strip()
        h_lower = h_clean.lower()
        if (
            h_clean
            and not any(inv in h_lower for inv in invalid_headings)
            and len(h_clean) > 3
            and not re.match(r"^Page \d+$", h_clean)
        ):
            if len(c.get("text", "").split()) > 10:
                valid_headings.append(h_clean)

    unique_headings = list(dict.fromkeys(valid_headings))
    questions = []

    for h in unique_headings:
        h_lower = h.lower()
        if "skill" in h_lower:
            questions.append(f"What key technical skills and frameworks are listed in {filename}?")
        elif "project" in h_lower:
            questions.append(f"What major projects and architecture implementations are detailed in {filename}?")
        elif "education" in h_lower or "qualification" in h_lower:
            questions.append(f"What educational background, degrees, and institutions are documented in {filename}?")
        elif "publication" in h_lower or "research" in h_lower or "paper" in h_lower:
            questions.append(f"What research publications, conferences, or papers are highlighted in {filename}?")
        elif len(questions) < 2 and len(h) < 45:
            questions.append(f"Summarize the key findings and details under '{h}'.")

        if len(questions) >= 3:
            break

    default_pool = [
        f"Summarize the key takeaways, projects, and metrics in {filename}.",
        f"What are the main technical competencies and achievements described in this document?",
        f"Provide a structured executive summary of {filename}.",
    ]

    for q in default_pool:
        if q not in questions and len(questions) < 3:
            questions.append(q)

    return questions[:3]


def parse_and_chunk_document(file_bytes: bytes, filename: str, content_type: str = "") -> dict:
    """
    Main entrypoint:
    Validates, parses (via LlamaParse or native zero-cost parser), chunks in-memory,
    and returns a structured ephemeral document object.
    """
    t0 = time.perf_counter()
    meta = validate_document(file_bytes, filename, content_type)
    ext = meta["extension"]

    if ext == ".pdf":
        markdown_text, parser_used = parse_pdf_with_llamaparse(file_bytes, filename)
    elif ext == ".json":
        markdown_text = parse_json_document(file_bytes)
        parser_used = "native_json"
    else:
        markdown_text = parse_markdown_or_txt(file_bytes)
        parser_used = "native_text"

    chunks = chunk_document_text(markdown_text, filename, meta["page_count"])
    total_words = sum(c["word_count"] for c in chunks)
    suggestions = generate_starter_questions(chunks, filename)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    return {
        "filename": filename,
        "extension": ext,
        "page_count": meta["page_count"],
        "word_count": total_words,
        "chunk_count": len(chunks),
        "parser_used": parser_used,
        "parse_time_ms": round(elapsed_ms, 1),
        "chunks": chunks,
        "starter_suggestions": suggestions,
        "preview_text": markdown_text[:1200] if markdown_text else "",
    }
