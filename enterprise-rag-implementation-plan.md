# Implementation Plan: Enterprise RAG Demo (Redwood Inference)

**Goal:** Build and deploy a free, live, shareable RAG demo based on the `EnterpriseRAG-Bench` dataset, for a job portfolio. Zero budget. Full CI/CD. Frontend built in Google Stitch.

This document is written to be handed directly to an AI coding assistant (Claude Code, Cursor, etc.) as a build spec. Each phase is self-contained and can be executed and verified before moving to the next.

---

## 0. Tech Stack (final)

| Layer | Tool | Notes |
|---|---|---|
| Dataset | EnterpriseRAG-Bench (Hugging Face) | Sample 1,000–2,000 docs across all 9 platforms |
| Embeddings | FastEmbed (BAAI/bge-large-en-v1.5) | Local, free |
| Vector DB | Pinecone Serverless (Starter/free) | 2GB storage, 1M RU / 2M WU free |
| LLM (primary) | Groq API (Llama 3.3 70B) | Free tier, fast |
| LLM (fallback) | OpenRouter free models | Used when Groq rate limit is hit |
| Agent orchestration | LangGraph | Router → Retrieval → Synthesis |
| Backend | FastAPI | `/ask` endpoint, `/health` endpoint |
| Frontend | Google Stitch (generated UI) + fetch calls to FastAPI | See Phase 5 |
| Eval | Ragas | 10–20 question fixed test set |
| Containerization | Docker | Single image, backend + static frontend build |
| Hosting | Hugging Face Spaces (free Docker Space) | Auto-deploys on git push |
| CI/CD | GitHub Actions | Eval gate → push to HF Space remote |

---

## 1. Prerequisites (accounts needed, all free)

1. GitHub account
2. Hugging Face account → create a **Docker-type Space** (e.g. `yourname/enterprise-rag`), generate an **HF access token** (write scope)
3. Pinecone account → free Starter project, get **API key**
4. Groq account → console.groq.com → get **API key**
5. OpenRouter account → get **API key** (fallback only)
6. Google Stitch access (for frontend generation)

Store these later as GitHub Actions **secrets**:
`HF_TOKEN`, `PINECONE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`

---

## 2. Repository Structure

```
enterprise-rag/
├── .github/workflows/deploy.yml
├── app/
│   ├── main.py                # FastAPI app, serves API + static frontend
│   ├── agent/
│   │   ├── graph.py            # LangGraph definition
│   │   ├── router.py           # intent classification node
│   │   ├── retriever.py        # Pinecone hybrid search node
│   │   └── synthesizer.py      # LLM answer generation node
│   ├── ingestion/
│   │   ├── sample_dataset.py   # pulls & samples EnterpriseRAG-Bench
│   │   ├── embed_and_upsert.py # FastEmbed -> Pinecone upsert
│   │   └── config.py
│   ├── llm_clients.py          # Groq client + OpenRouter fallback logic
│   └── requirements.txt
├── eval/
│   ├── test_questions.json     # 10-20 fixed Q&A pairs for Ragas
│   └── run_eval.py
├── frontend/
│   └── (Google Stitch export: index.html, styles, JS)
├── Dockerfile
├── .env.example
└── README.md
```

---

## 3. Phase 1 — Data Ingestion

**⚠️ Critical ordering — do this before random sampling:** if you sample randomly first, the documents needed to answer your Phase 4 eval questions almost certainly won't be in the sample (1,500 out of 500,000 is a ~0.3% draw). Every eval question will fail not because the agent is bad, but because the ground-truth context was never in the database. Seed first, sample second.

**Task for AI agent:**
1. Download `EnterpriseRAG-Bench` from Hugging Face datasets.
2. **First**, write your 10–20 evaluation questions (can draft these now, see Phase 4), and identify/extract the specific 20–30 `doc_id`s that contain the ground-truth answers to those questions. Insert these into the sample set unconditionally — they are guaranteed members of your final ~1,500-doc set.
3. **Then**, randomly sample the remaining ~1,470 documents across the 9 platforms as "noise" — this preserves the dataset's intended messiness (misfiled docs, conflicting info, irrelevant chatter) without accidentally excluding the docs your eval depends on.
4. For each doc, extract metadata: `doc_id`, `source_type` (slack/gmail/github/jira/confluence/etc.), `timestamp`, `author` if present.
5. Chunk long documents (~500 tokens per chunk, 50-token overlap).
6. Embed each chunk with FastEmbed (`BAAI/bge-large-en-v1.5`).
7. Upsert into Pinecone: vector + metadata (`doc_id`, `source_type`, `timestamp`, `chunk_text`).
8. Create ONE Pinecone serverless index, e.g. `enterprise-rag-demo`, dimension matching bge-large (1024), metric `cosine`, **cloud/region set to `aws` / `us-east-1`** (Pinecone Starter/free plan only supports specific cloud+region combos for serverless indexes — check the current allowed list in the Pinecone console before creating the index, since picking an unsupported region will fail index creation).

**Verification:** query Pinecone index stats — confirm vector count matches expected chunk count, and `describe_index_stats()` shows non-zero namespaces.

---

## 4. Phase 2 — LangGraph Agent

**Nodes:**

1. **Router node** — lightweight Groq call classifies incoming question into: `basic`, `project_related`, `conflicting_info`. Output determines which source_type filters to prioritize (e.g. project_related → filter `source_type in [jira, github]` first).
2. **Retriever node** — embeds the query with FastEmbed, queries Pinecone with metadata filter + top_k (e.g. 10), optionally re-ranks with simple keyword overlap scoring (BM25-lite, no extra service needed) down to top 5.
   - **⚠️ Fallback required:** a strict `source_type` filter returns zero chunks whenever the router slightly misclassifies intent, or when the real answer lives in a platform the filter excluded (e.g. filtered to `[jira, github]` but the answer is actually in a Slack thread). Don't let this silently starve the synthesizer. If the filtered query returns 0 results, automatically re-run the same query **without** the metadata filter before passing anything to the synthesizer node. Log which path was taken (filtered vs. fallback) for debugging.
3. **Synthesizer node** — sends the query + top 5 chunks (with doc_id/source/timestamp) to Groq (fallback OpenRouter on 429/error) with a system prompt instructing:
   - Cite `doc_id` for every claim
   - On conflicting info, prefer higher-authority sources (Confluence/official docs > Slack messages) and prefer more recent timestamps
   - If no relevant docs found, say so rather than hallucinating

**Task for AI agent:** implement this as a LangGraph `StateGraph` with these three nodes wired router → retriever → synthesizer → END. State object carries: `query`, `intent`, `retrieved_chunks`, `answer`.

**LLM client requirement:** wrap Groq calls in try/except; on rate-limit (429) or timeout, fall back to OpenRouter automatically. Log which provider served each request.

---

## 5. Phase 3 — FastAPI Backend

Endpoints:
- `POST /ask` — body `{ "question": str }`, returns `{ "answer": str, "sources": [{"doc_id":..., "source_type":..., "timestamp":...}], "provider_used": str }`
  - **⚠️ Dedupe sources before returning them:** since documents are chunked, the top-5 retrieved chunks can easily include 2-3 chunks from the same `doc_id`. Returning all of them as separate "sources" makes the UI show the same document repeated. Deduplicate by `doc_id` before building the `sources` list in the response.
- `GET /health` — returns `{"status": "ok"}`, used by HF Spaces and CI

Serve the **Google Stitch-exported frontend** as static files from FastAPI (mount `/frontend` build output at `/`), so the whole app is one container, one Space, one URL.

**Task for AI agent:** implement `app/main.py` with FastAPI and static file mounting. **On CORS:** since the Stitch frontend is served by this same FastAPI app in production (Phase 5), same-origin requests won't need CORS headers at all in the deployed version. Add CORS middleware anyway, scoped to `*` or `localhost` origins, purely so the Stitch preview environment (which runs on its own domain during design/testing, before export) can hit a locally-running FastAPI instance during development. Don't rely on CORS being present in production — the real fix is same-origin static mounting.

---

## 6. Phase 4 — Evaluation (Ragas)

1. Write `eval/test_questions.json`: 10–20 fixed questions covering all three intents (basic, project_related, conflicting_info), each with a reference/ground-truth answer and expected doc_ids. **Draft these questions early — before Phase 1's sampling step — since Phase 1 needs their ground-truth doc_ids to seed the sample.**
2. `eval/run_eval.py`: runs each question through the deployed agent logic (import directly, no need to hit a live URL), computes Ragas metrics (answer correctness, context recall).
3. Script exits non-zero if average score falls below a threshold (e.g. 0.6) — this is the CI gate.

**⚠️ Rate-limit trap:** Ragas uses an LLM-as-judge internally, which fires many concurrent calls to score each question. Against Groq's free tier (~30 RPM), this triggers `429 Too Many Requests` almost immediately and crashes the CI job outright. Instruct the AI agent to:
- Run eval questions **sequentially, not concurrently** (disable Ragas's async/parallel execution if it defaults to it).
- Add a forced delay (e.g. `asyncio.sleep(3)` or equivalent) between LLM calls.
- Wrap Groq calls in a retry decorator (e.g. `tenacity`) with exponential backoff, so a transient 429 doesn't hard-fail the whole eval run.
- With only 10–20 questions and a 3-second spacing, this comfortably stays under the free-tier RPM ceiling.

---

## 7. Phase 5 — Frontend (Google Stitch)

1. In Google Stitch, design a simple chat UI: message input, send button, chat history area, and a small "sources" panel/expandable list under each answer showing `doc_id` + `source_type` badges (e.g. colored tag per platform).
2. Export the generated HTML/CSS/JS from Stitch into `frontend/`.
3. Point the frontend's fetch call at `/ask` (relative path — since frontend is served by the same FastAPI app, no CORS issues, no separate hosting needed).
4. Example fetch the AI agent should wire into the exported Stitch code:

```javascript
async function askQuestion(question) {
  const res = await fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  return await res.json();
}
```

5. Render `answer`, and render `sources` as small tags under the answer bubble.

---

## 8. Phase 6 — Docker

**⚠️ Cold-start trap:** FastEmbed downloads the `BAAI/bge-large-en-v1.5` weights (~1.3GB) on first use. If this download happens at container *startup* instead of *build time*, it can take 1–2 minutes — long enough that Hugging Face Spaces' health check assumes the app crashed and kills the container before it ever finishes booting. The fix is to force the download during the Docker **build** step, so the weights are already cached inside the image when the container starts.

**Task for AI agent:** write a single `Dockerfile` that:
1. Uses `python:3.11-slim` base
2. Installs `app/requirements.txt`
3. **Bakes the embedding model into the image** by adding this line after installing dependencies and before copying app code:
   ```dockerfile
   RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-large-en-v1.5')"
   ```
   This forces the ~1.3GB model download to happen once, during `docker build`, not on every container start.
4. Copies `app/` and `frontend/` build output into the image
5. Exposes port `7860` (Hugging Face Spaces' default expected port for Docker Spaces)
6. CMD runs `uvicorn app.main:app --host 0.0.0.0 --port 7860`

Include a `.dockerignore` excluding `.git`, `__pycache__`, `.env`.

---

## 9. Phase 7 — CI/CD (GitHub Actions → Hugging Face Spaces)

`.github/workflows/deploy.yml` logic:

1. **Trigger:** on push to `main`
2. **Job `test`:**
   - checkout repo
   - set up Python
   - install `app/requirements.txt`
   - run `python eval/run_eval.py` using secrets `PINECONE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`
   - fail the workflow if the eval script exits non-zero
3. **Job `deploy`** (needs: `test`, only runs if test passes):
   - checkout repo with full git history
   - configure git remote to the Hugging Face Space: `https://user:$HF_TOKEN@huggingface.co/spaces/yourname/enterprise-rag`
   - `git push hf main --force` (or use `huggingface_hub` Python API's `upload_folder` as an alternative to git push)
   - HF Spaces detects the push and automatically rebuilds the Docker container

**Task for AI agent:** write this as a working `deploy.yml`, using GitHub Secrets for all four API keys plus `HF_TOKEN`. Also add the same secrets as **HF Space repository secrets** (Pinecone/Groq/OpenRouter keys), since the running container needs them at runtime too, not just at CI time.

**⚠️ Shared quota trap:** Groq's free-tier rate limit applies **per organization, not per API key** — if the CI eval job runs at the same moment someone is actively using the live demo, both draw from the same ~30 RPM pool. With only 10-20 eval questions spaced 3 seconds apart this is a small window of risk, not a likely collision, but if you ever see live-demo requests failing during/after a push, this shared quota is why. Using a separate Groq API key for CI doesn't help — the limit is org-wide regardless of key.

---

## 10. Phase 8 — README

**⚠️ Sleep-mode reality (verified via HF's own docs):** the free `cpu-basic` tier puts a Space to sleep after 48 hours with no visitors, and waking it back up takes roughly 30–90 seconds on the next request. This is separate from — and not fixed by — the Phase 6 fix of baking the FastEmbed model into the Docker image; that fix only prevents a slow *first build*, not this recurring *cold start after idle*. A recruiter clicking your link after a quiet weekend will hit this every time.

Two ways to handle it — pick one:
- **Minimum viable fix:** add a visible note in the README right next to the live link, e.g. *"Free-tier hosting — if the demo hasn't been visited recently, the first load may take up to ~90 seconds to wake up. Please wait rather than assuming it's broken."* Costs nothing, manages expectations.
- **Optional upgrade:** add a separate scheduled GitHub Actions workflow that pings the Space URL roughly every 24–40 hours to keep it from ever going fully idle. Still $0, just an extra small workflow to maintain — worth it if you're actively sharing the link during a job search.

Write a portfolio-quality `README.md`:
- One-line project description + **live demo link**
- Architecture diagram (can be an image or a simple ASCII/mermaid diagram)
- Why the dataset was scoped down from 500K to ~1,500 docs (engineering judgment, not a limitation)
- Tech stack table
- How conflict resolution and source-authority logic works (this is the standout feature — call it out explicitly)
- Local setup instructions
- Eval results table (Ragas scores)

---

## 11. Build Order Checklist

- [ ] Phase 4a (do this first): draft 10–20 eval questions + identify their ground-truth `doc_id`s
- [ ] Phase 1: seed those ground-truth docs into the sample, then random-sample the rest as noise, ingestion script runs, Pinecone index populated
- [ ] Phase 2: LangGraph agent answers a test question correctly via a local script (no API yet), fallback (unfiltered) retrieval confirmed to trigger when filtered search returns 0
- [ ] Phase 3: FastAPI `/ask` works locally via curl/Postman
- [ ] Phase 4b: Ragas eval script runs locally with sequential/rate-limited calls and passes threshold
- [ ] Phase 5: Stitch frontend talks to local FastAPI successfully
- [ ] Phase 6: `docker build` (confirm FastEmbed model is baked in, not downloaded at runtime) + `docker run` works locally, app reachable at `localhost:7860`
- [ ] Phase 7: GitHub Actions secrets set, HF Space secrets set, push to `main` triggers full pipeline and Space redeploys
- [ ] Phase 8: README finalized with live link

---

## Notes for the AI agent building this

- Keep API keys out of code — always read from environment variables, provide `.env.example`.
- Add basic retry/backoff around Groq calls specifically (30 req/min free tier limit) so demo traffic bursts degrade gracefully to OpenRouter instead of failing.
- Pinecone free plan has generous headroom for this scope (2GB storage vs. ~1,500 docs' worth of 1024-dim vectors is a small fraction of the limit) — no need to optimize storage aggressively.
- Hugging Face Spaces free CPU tier has no persistent GPU — FastEmbed and Groq/OpenRouter calls are the right choice specifically because they don't need local GPU inference.

### Failure modes this spec has been corrected for — do not undo these when building:
1. **Eval ground-truth must be seeded before random sampling** (Phase 1) — otherwise eval questions test against documents that were never ingested.
2. **Retriever needs an unfiltered fallback** (Phase 2) — a strict metadata filter with zero hits must not be a dead end.
3. **Ragas eval must run sequentially with delays/retries** (Phase 4) — concurrent LLM-as-judge calls will 429 against Groq's free tier and crash CI.
4. **FastEmbed model weights must be baked into the Docker image at build time** (Phase 6) — downloading them at container startup causes Hugging Face Spaces to kill the container before it finishes booting.
5. **HF Spaces sleeps after 48h idle, ~30-90s cold start on wake** (Phase 8) — separate problem from #4, not solved by it; needs a README note at minimum.
6. **Pinecone serverless index needs a supported cloud/region set at creation** (Phase 1) — verify the current allowed list in the Pinecone console before creating the index.
7. **CORS is a dev-time convenience, not a production requirement** (Phase 3/5) — production frontend is same-origin via static mounting; don't let CORS config mask a same-origin setup that isn't actually wired correctly.
8. **Dedupe `sources` by `doc_id` before returning them** (Phase 3) — chunking means multiple top-5 chunks can share a doc_id; showing duplicates looks like a bug in the demo UI.
9. **Groq's rate limit is org-wide, not per-key** (Phase 7) — CI eval calls and live demo traffic share the same 30 RPM budget; a second API key for CI does not add headroom.
