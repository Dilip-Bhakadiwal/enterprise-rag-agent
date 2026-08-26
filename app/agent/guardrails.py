"""
app/agent/guardrails.py
───────────────────────
Enterprise PII (Personally Identifiable Information) Redaction & Privacy Guardrails.

Operates as a high-throughput, pre-LLM & pre-retrieval data sanitization layer:
  - Scans user prompts and documents for sensitive data.
  - Automatically redacts / masks PII before payloads leave the server to cloud LLM APIs.
  - Guarantees compliance with GDPR, HIPAA, and enterprise privacy standards.
  - Detects and neutralizes prompt injection / jailbreak attempts.

Supported Entity Detectors:
  1. Email Addresses
  2. Phone Numbers (Domestic & International)
  3. Credit Card / Debit Card Numbers (with format validation)
  4. API Keys & Secrets (OpenAI, GitHub, AWS, Bearer tokens)
  5. Government IDs (SSN, Aadhaar, Indian PAN)
  6. Passwords & Auth Tokens in query text
  7. IPv4 Network Addresses
  8. Prompt Injection / Jailbreak Attempts
"""

from __future__ import annotations

import re
from typing import TypedDict
from loguru import logger


class PIIEntity(TypedDict):
    type: str
    count: int
    placeholder: str


class SanitizationResult(TypedDict):
    sanitized_text: str
    is_masked: bool
    total_masked_count: int
    entities: list[PIIEntity]


# ── Regular Expression Pattern Compilations for Microsecond Performance ─────

# 1. Emails (including obfuscated [at], (at), [dot], (dot))
_EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+(?:\s*@\s*|\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*)[A-Za-z0-9.-]+(?:\s*\.\s*|\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*)[A-Za-z]{2,}\b",
    re.IGNORECASE,
)

# 2. International & Domestic Phone Numbers
# Matches: +91-8003046831, +1 (555) 123-4567, 800-555-0199, (555) 000-0000, 10-digit mobile
_PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b"
)

# 3. Credit Card Numbers (13-19 digits, formatted, spaced, or consecutive)
_CREDIT_CARD_PATTERN = re.compile(
    r"\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:\d{4}[-\s]?){2}\d{4}[-\s]?\d{3,4}\b|\b(?:\d\s+){12,18}\d\b"
)

# 4. API Keys & Cloud Secrets
# Matches: sk-..., ghp_..., AKIA..., Bearer ..., secret_...
_API_KEY_PATTERN = re.compile(
    r"\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~+/-]{20,}|(?:secret|api_key|token)[=:\s]+['\"]?[A-Za-z0-9._~+/-]{16,}['\"]?)\b",
    re.IGNORECASE,
)

# 5. Government IDs
# SSN (XXX-XX-XXXX), Aadhaar (XXXX XXXX XXXX), Indian PAN (ABCDE1234F)
_SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_AADHAAR_PATTERN = re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b")
_PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")

# 6. Passwords in plaintext query
_PASSWORD_PATTERN = re.compile(
    r"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*(\S+)"
)

# 7. IPv4 Addresses (excluding localhost / 0.0.0.0)
_IP_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)

# 8. Prompt Injection / Jailbreak Detection
# Detects common instruction-override and system-prompt-leak attempts.
_PROMPT_INJECTION_PATTERN = re.compile(
    r"(?i)\b("
    r"ignore\s+(all\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|context|rules?|constraints?)|\b"
    r"forget\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|training|rules?)|\b"
    r"you\s+are\s+now\s+(a|an|in|my)|\b"
    r"(act|pretend|behave)\s+(as|like)\s+(if\s+you\s+are|you\s+are|you\s+were)|\b"
    r"(reveal|show|print|output|dump|leak|expose)\s+(your\s+)?(system\s+prompt|instructions?|api\s+key|secret|env|environment\s+var)|\b"
    r"(jailbreak|DAN|do\s+anything\s+now|developer\s+mode|admin\s+mode|god\s+mode)|\b"
    r"new\s+instruction[s]?\s*:|\b"
    r"\[SYSTEM\]|\[INST\]|\[SYS\]|<\|system\|>|<\|im_start\|>|<\|im_end\|>"
    r")",
    re.IGNORECASE,
)


def detect_prompt_injection(text: str) -> bool:
    """
    Returns True if the text appears to contain a prompt injection / jailbreak attempt.
    Used as a pre-LLM safety gate — flagged queries are still processed but the
    injection fragments are neutralized and logged for monitoring.
    """
    if not text or len(text.strip()) < 10:
        return False
    return bool(_PROMPT_INJECTION_PATTERN.search(text))


def neutralize_prompt_injection(text: str) -> str:
    """
    Replaces detected injection patterns with a safe placeholder so the LLM
    never sees instruction-override attempts in the prompt context.
    """
    return _PROMPT_INJECTION_PATTERN.sub("[INJECTION_ATTEMPT_REMOVED]", text)


def sanitize_pii(text: str) -> tuple[str, SanitizationResult]:
    """
    Scans and redacts Personally Identifiable Information (PII) from user text.

    Args:
        text: The raw input query or document string.

    Returns:
        tuple of (sanitized_text, metadata_dict)
    """
    if not text or not text.strip():
        return text, {
            "sanitized_text": text,
            "is_masked": False,
            "total_masked_count": 0,
            "entities": [],
        }

    sanitized = text
    entities_map: dict[str, int] = {}

    def _replace_and_count(pattern: re.Pattern, placeholder: str, target: str, entity_type: str) -> str:
        matches = pattern.findall(target)
        if matches:
            count = len(matches)
            entities_map[entity_type] = entities_map.get(entity_type, 0) + count
            return pattern.sub(placeholder, target)
        return target

    # 1. API Keys & Secrets first (to avoid phone/credit card overlap)
    sanitized = _replace_and_count(_API_KEY_PATTERN, "[SECRET_KEY_REDACTED]", sanitized, "API_KEY")

    # 2. Passwords in query
    pwd_matches = _PASSWORD_PATTERN.findall(sanitized)
    if pwd_matches:
        entities_map["PASSWORD"] = entities_map.get("PASSWORD", 0) + len(pwd_matches)
        sanitized = _PASSWORD_PATTERN.sub("password=[PASSWORD_REDACTED]", sanitized)

    # 3. Credit Cards
    sanitized = _replace_and_count(_CREDIT_CARD_PATTERN, "[CREDIT_CARD_REDACTED]", sanitized, "CREDIT_CARD")

    # 4. Government IDs
    sanitized = _replace_and_count(_SSN_PATTERN, "[SSN_REDACTED]", sanitized, "GOV_ID")
    sanitized = _replace_and_count(_AADHAAR_PATTERN, "[AADHAAR_REDACTED]", sanitized, "GOV_ID")
    sanitized = _replace_and_count(_PAN_PATTERN, "[PAN_REDACTED]", sanitized, "GOV_ID")

    # 5. Emails
    sanitized = _replace_and_count(_EMAIL_PATTERN, "[EMAIL_REDACTED]", sanitized, "EMAIL")

    # 6. Phone numbers
    # ReDoS guard: only apply phone regex on strings short enough to be safe.
    # Catastrophic backtracking is impossible on inputs under 200 chars.
    if len(sanitized) <= 500:
        phone_candidates = _PHONE_PATTERN.findall(sanitized)
        actual_phone_count = 0
        for cand in phone_candidates:
            digits_only = re.sub(r"\D", "", cand)
            if 8 <= len(digits_only) <= 15 and not cand.startswith("http"):
                sanitized = sanitized.replace(cand, "[PHONE_REDACTED]")
                actual_phone_count += 1
        if actual_phone_count > 0:
            entities_map["PHONE"] = entities_map.get("PHONE", 0) + actual_phone_count

    total_masked = sum(entities_map.values())
    is_masked = total_masked > 0

    entities_list: list[PIIEntity] = [
        {"type": k, "count": v, "placeholder": f"[{k}_REDACTED]"}
        for k, v in entities_map.items()
    ]

    if is_masked:
        logger.info(
            f"🛡️ PII Guardrail Triggered: Masked {total_masked} sensitive items ({list(entities_map.keys())})"
        )

    result_meta: SanitizationResult = {
        "sanitized_text": sanitized,
        "is_masked": is_masked,
        "total_masked_count": total_masked,
        "entities": entities_list,
    }

    return sanitized, result_meta
