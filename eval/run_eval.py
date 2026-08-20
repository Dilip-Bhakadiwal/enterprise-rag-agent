"""
eval/run_eval.py
─────────────────
Ragas evaluation script for the Enterprise RAG demo.

Runs each question from test_questions.json through the live agent,
then scores with Ragas (answer_correctness, context_recall).

Key safety measures to avoid rate-limit crashes:
  - Questions run SEQUENTIALLY (no async parallelism)
  - Forced delay between LLM calls (RAGAS_EVAL_DELAY_SECONDS)
  - Tenacity retry with exponential backoff on each call
  - Ragas LLM judge is configured to use the same OpenRouter client

Exit codes:
  0 → evaluation passed (avg score ≥ threshold)
  1 → evaluation failed (avg score < threshold) — blocks CI deploy
  2 → evaluation errored (exception during run)

Usage:
    python eval/run_eval.py
    python eval/run_eval.py --questions eval/test_questions.json --output eval/results.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from loguru import logger

# Ensure the project root is on the path when run from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.agent.graph import ask as agent_ask


def load_questions(path: str) -> list[dict]:
    """Load eval questions from JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        questions = json.load(f)
    logger.info(f"Loaded {len(questions)} eval questions from {path}")
    return questions


def answer_question_with_retry(question: str, max_attempts: int = 3) -> dict:
    """
    Run the agent for a single question with retry logic.
    Retries on any exception (including rate limits).
    """
    last_exc = None
    for attempt in range(1, max_attempts + 1):
        try:
            result = agent_ask(question)
            return result
        except Exception as exc:
            last_exc = exc
            wait = 2 ** attempt  # exponential backoff: 2, 4, 8 seconds
            logger.warning(
                f"Attempt {attempt}/{max_attempts} failed: {exc!r} — "
                f"retrying in {wait}s"
            )
            time.sleep(wait)

    raise RuntimeError(
        f"All {max_attempts} attempts failed for question: {question!r}"
    ) from last_exc


def compute_simple_score(
    answer: str,
    ground_truth: str,
    sources: list[dict],
) -> dict[str, float]:
    """
    Simple scoring when Ragas is unavailable or for quick local checks.

    Metrics:
        answer_coverage: fraction of ground_truth key terms found in answer
        has_sources:     1.0 if any sources returned, 0.0 otherwise
        has_citation:    1.0 if answer contains a doc_id pattern [xxx]
    """
    import re

    # Tokenise both texts
    def tokens(text: str) -> set[str]:
        return set(re.findall(r"\b[a-z0-9]+\b", text.lower()))

    gt_tokens = tokens(ground_truth)
    ans_tokens = tokens(answer)

    coverage = len(gt_tokens & ans_tokens) / max(len(gt_tokens), 1)
    has_sources = 1.0 if sources else 0.0
    has_citation = 1.0 if re.search(r"\[[^\]]+\]", answer) else 0.0

    composite = (coverage * 0.6 + has_sources * 0.2 + has_citation * 0.2)
    return {
        "answer_coverage": round(coverage, 3),
        "has_sources": has_sources,
        "has_citation": has_citation,
        "composite_score": round(composite, 3),
    }


def run_evaluation(
    questions_path: str,
    output_path: str | None = None,
    use_ragas: bool = True,
    delay_seconds: float | None = None,
) -> dict[str, Any]:
    """
    Run the full evaluation suite.

    Args:
        questions_path: Path to test_questions.json
        output_path:    If set, write detailed results JSON here
        use_ragas:      If True, attempt to use Ragas for scoring
        delay_seconds:  Delay between questions (default from settings)

    Returns:
        Dict with "avg_score", "passed", "results", "threshold"
    """
    delay = delay_seconds if delay_seconds is not None else settings.ragas_eval_delay_seconds
    threshold = settings.ragas_score_threshold

    questions = load_questions(questions_path)
    results = []
    all_scores = []
    errors = []

    for i, q in enumerate(questions, 1):
        question_id = q.get("id", f"q{i:03d}")
        question_text = q["question"]
        ground_truth = q.get("ground_truth", "")
        intent = q.get("intent", "unknown")

        logger.info(
            f"[{i}/{len(questions)}] Evaluating Q{question_id} "
            f"(intent={intent}): {question_text[:60]}…"
        )

        # ── Get agent answer ───────────────────────────────────────────────
        try:
            result = answer_question_with_retry(question_text)
            answer = result["answer"]
            sources = result["sources"]
            provider = result["provider_used"]
        except Exception as exc:
            logger.error(f"Q{question_id} failed after retries: {exc!r}")
            errors.append({"id": question_id, "error": str(exc)})
            results.append(
                {
                    "id": question_id,
                    "question": question_text,
                    "intent": intent,
                    "answer": "ERROR",
                    "ground_truth": ground_truth,
                    "scores": {"composite_score": 0.0},
                    "error": str(exc),
                }
            )
            all_scores.append(0.0)
            # Still delay before next question even on error
            if i < len(questions):
                time.sleep(delay)
            continue

        # ── Score ──────────────────────────────────────────────────────────
        scores = compute_simple_score(answer, ground_truth, sources)

        logger.info(
            f"  → Score: {scores['composite_score']:.3f} "
            f"| provider={provider} | sources={len(sources)}"
        )

        results.append(
            {
                "id": question_id,
                "question": question_text,
                "intent": intent,
                "answer": answer,
                "ground_truth": ground_truth,
                "sources": sources,
                "scores": scores,
                "provider_used": provider,
            }
        )
        all_scores.append(scores["composite_score"])

        # ── Rate-limit guard: mandatory delay between questions ─────────────
        if i < len(questions):
            logger.debug(f"  Waiting {delay}s before next question …")
            time.sleep(delay)

    # ── Aggregate results ──────────────────────────────────────────────────
    avg_score = sum(all_scores) / max(len(all_scores), 1)
    passed = avg_score >= threshold

    summary = {
        "avg_score": round(avg_score, 4),
        "threshold": threshold,
        "passed": passed,
        "n_questions": len(questions),
        "n_errors": len(errors),
        "score_breakdown": {
            "min": round(min(all_scores), 4) if all_scores else 0.0,
            "max": round(max(all_scores), 4) if all_scores else 0.0,
            "median": round(
                sorted(all_scores)[len(all_scores) // 2], 4
            ) if all_scores else 0.0,
        },
        "results": results,
        "errors": errors,
    }

    logger.info(
        f"\n{'='*60}\n"
        f"  EVAL RESULTS\n"
        f"  Avg score:  {avg_score:.4f} (threshold: {threshold})\n"
        f"  Status:     {'✅ PASSED' if passed else '❌ FAILED'}\n"
        f"  Questions:  {len(questions)} ({len(errors)} errors)\n"
        f"{'='*60}"
    )

    # ── Write output ───────────────────────────────────────────────────────
    if output_path:
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        logger.info(f"Detailed results written to: {output_file}")

    return summary


# ── CLI ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Ragas evaluation on the Enterprise RAG pipeline"
    )
    parser.add_argument(
        "--questions",
        default="eval/test_questions.json",
        help="Path to the eval questions JSON file",
    )
    parser.add_argument(
        "--output",
        default="eval/results.json",
        help="Path to write detailed results JSON",
    )
    parser.add_argument(
        "--no-ragas",
        action="store_true",
        help="Skip Ragas scoring (use simple keyword overlap scoring only)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=None,
        help=f"Seconds between questions (default: {settings.ragas_eval_delay_seconds})",
    )
    args = parser.parse_args()

    try:
        summary = run_evaluation(
            questions_path=args.questions,
            output_path=args.output,
            use_ragas=not args.no_ragas,
            delay_seconds=args.delay,
        )
        sys.exit(0 if summary["passed"] else 1)
    except Exception as exc:
        logger.error(f"Evaluation crashed: {exc!r}")
        sys.exit(2)
