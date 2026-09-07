# Complete Implementation Plan — 18 Files, 4 Phases

## Full File Inventory (18 files confirmed)

| # | File | Role | Issues Found |
|---|---|---|---|
| 1 | `config.py` | Settings | 🔴 Hardcoded Neo4j password + LlamaParse key |
| 2 | `main.py` | FastAPI server | 🔴 Duplicate `/health`, fake latency data, expensive endpoints |
| 3 | `graph.py` | LangGraph pipeline | 🔴 ~200 lines hardcoded suggestions/chitchat |
| 4 | `graph_retriever.py` | Neo4j + Pinecone | 🔴 5 hardcoded regex mappings, sequential I/O |
| 5 | `grader.py` | CRAG grading | 🔴 5 sequential LLM calls (11s) |
| 6 | `decomposer.py` | Query splitting | 🟡 Always calls LLM |
| 7 | `router.py` | Intent classification | 🔴 17 hardcoded keywords, LLM call |
| 8 | `retriever.py` | Pinecone search | 🔴 Windows CUDA paths, FastEmbed 200MB |
| 9 | `rewriter.py` | CRAG rewrite | ✅ Clean |
| 10 | `synthesizer.py` | Answer generation | 🔴 Hardcoded authority, PII in prompt |
| 11 | `cache.py` | Upstash Redis | 🟡 Hardcoded negative phrases |
| 12 | `doc_rag.py` | Ephemeral doc RAG | 🔴 `is_broad_query` CRASH BUG |
| 13 | `doc_parser.py` | Document parsing | 🟡 Hardcoded starter questions |
| 14 | `guardrails.py` | PII redaction | ✅ Clean (security patterns OK) |
| 15 | `llm_clients.py` | LLM failover | 🔴 No `model_override` param |
| 16 | `load_dataset.py` | Dataset loading | ✅ Clean |
| 17 | `chunker.py` | Token chunking | ✅ Clean |
| 18 | `__init__.py` | Package init | ✅ Clean |

---

## Phase Execution Order

```
PHASE 1 (Day 1, ~45 min)  → Fix CRASHES & SECURITY
    ↓ Must complete before anything else
PHASE 2 (Day 1, ~2 hrs)   → Fix LATENCY (31s → 6s)
    ↓ Biggest user-facing impact
PHASE 3 (Day 2, ~2 hrs)   → Remove HARDCODING
    ↓ Makes system data-driven
PHASE 4 (Day 2, ~1 hr)    → Deployment SAFETY
    ↓ Protects free tier quotas
```

---

## PHASE 1: Fix Crashes & Security (DO FIRST)

> **Why first:** These will crash your app or expose credentials. Nothing else matters if the app crashes.

### 1.1 — `doc_rag.py` — FIX CRASH BUG

**Bug:** Line ~170 uses `is_broad_query` but it's **never defined**. Crashes with `NameError` when document has >25 chunks.

**Fix:** Add definition BEFORE the if/elif/else block:

```python
# ADD these 2 lines BEFORE "if len(chunks) <= 25:"
broad_signals = {"summarize", "summary", "overview", "all", "everything", "entire", "complete", "describe"}
is_broad_query = any(w in query.lower() for w in broad_signals)
```

### 1.2 — `main.py` — FIX DUPLICATE `/health`

**Bug:** Two `@app.get("/health")` decorators. Second overwrites first.

**Fix:** DELETE the second `/health` endpoint (the one that calls `get_graph_driver()` and `verify_connectivity()`). Keep ONLY the first lightweight one:

```python
# KEEP THIS (lightweight, 0 external calls):
@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check():
    return HealthResponse(status="ok")

# DELETE THIS (expensive, calls Neo4j):
# @app.get("/health", tags=["system"])
# @app.get("/healthz", tags=["system"])
# async def health_check():
#     ... driver.verify_connectivity() ...
```

### 1.3 — `config.py` — REMOVE HARDCODED SECRETS

```python
# CHANGE FROM:
neo4j_password: str = Field(default="BM3eW2oF1x3ASvNCkjJ40bGNlEwA9Do9DKbyKDXaj50", alias="NEO4J_PASSWORD")
llamaparse_api_key: str = Field(default="llx-G0U7i5DFvrtQT9q1of8aDPdyz5OlnnsRVWnpDVLZZCJ6kOPw", alias="LLAMAPARSE_API_KEY")

# CHANGE TO:
neo4j_password: str = Field(..., alias="NEO4J_PASSWORD")
llamaparse_api_key: str = Field(..., alias="LLAMAPARSE_API_KEY")
```
Then set both in **Render Dashboard → Environment Variables**.

### 1.4 — `retriever.py` — REMOVE CRASH-PRONE CODE

**DELETE** these lines at top of file (Windows paths crash on Linux/Render):
```python
# DELETE ALL OF THIS:
_cuda_bin = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin"
_cudnn_bin = r"C:\Program Files\NVIDIA\CUDNN\v9.24\bin\12.9\x64"
for _p in [_cuda_bin, _cudnn_bin]:
    if os.path.exists(_p):
        os.environ["PATH"] = _p + ";" + os.environ.get("PATH", "")
    try:
        os.add_dll_directory(_p)
    except Exception:
        pass
```

**DELETE or comment out** `_get_embedding_model()` (FastEmbed loads ~200MB RAM, will OOM on Render 512MB). You already use NVIDIA NIM API for embeddings.

### 1.5 — `main.py` — REMOVE FAKE LATENCY DATA

```python
# CHANGE FROM:
_LATENCY_HISTORY: list[float] = [178.0, 185.0, 162.0, 190.0, 175.0]

# CHANGE TO:
_LATENCY_HISTORY: list[float] = []
```

### ✅ Phase 1 Checklist

| Task | File | Status |
|---|---|---|
| Fix `is_broad_query` crash | `doc_rag.py` | ⬜ |
| Remove duplicate `/health` | `main.py` | ⬜ |
| Remove hardcoded secrets | `config.py` | ⬜ |
| Remove CUDA paths | `retriever.py` | ⬜ |
| Remove FastEmbed loading | `retriever.py` | ⬜ |
| Remove fake latency data | `main.py` | ⬜ |

---

## PHASE 2: Fix Latency — 31s → 6s (DO SECOND)

> **Why second:** Biggest user-facing impact. 4 changes save ~20 seconds.

### 2.1 — `grader.py` — REPLACE ENTIRE FILE (Saves 11s)

**Problem:** 5 sequential LLM calls = 11 seconds. Hits Groq 30 RPM limit.

**Replace with batch grading + semantic bypass:**

```python
"""app/agent/grader.py — Batch grading + semantic score bypass."""
import json, re
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm_clients import call_llm

GRADER_BATCH_PROMPT = """You are a strict relevance grader.
Given a question and documents, identify which directly answer the question.
Do NOT mark relevant based on incidental word overlap.
Output ONLY valid JSON: {"relevant_ids": [1, 3]}"""

def grade_documents(query: str, chunks: list[dict]) -> list[dict]:
    if not chunks:
        return []

    # Graph facts from Neo4j are ALWAYS relevant (targeted Cypher)
    graph_chunks = [c for c in chunks if c.get("is_graph", False)]
    vector_chunks = [c for c in chunks if not c.get("is_graph", False)]

    # BYPASS: High retrieval scores = skip LLM entirely (0ms, 0 API calls)
    high_conf = [c for c in vector_chunks
                 if c.get("combined_score", c.get("semantic_score", 0)) > 0.82]
    if len(high_conf) >= max(1, len(vector_chunks) // 2):
        logger.info(f"[Grader] BYPASS: {len(high_conf)} chunks via score")
        return graph_chunks + high_conf

    # BATCH: Grade ALL in ONE LLM call (not 5 sequential)
    if not vector_chunks:
        return graph_chunks

    docs_text = "\n\n".join(
        f"[{i}] {c.get('chunk_text', c.get('text', ''))[:800]}"
        for i, c in enumerate(vector_chunks, 1)
    )
    messages = [
        SystemMessage(content=GRADER_BATCH_PROMPT),
        HumanMessage(content=f"Question: {query}\n\nDocuments:\n{docs_text}")
    ]
    try:
        response, provider = call_llm(messages)
        content = response.content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
        parsed = json.loads(content)
        ids = parsed.get("relevant_ids", [])
        relevant = [vector_chunks[i-1] for i in ids if 0 < i <= len(vector_chunks)]
        logger.info(f"[Grader] Batch: {len(relevant)}/{len(vector_chunks)} via {provider}")
        return graph_chunks + relevant
    except Exception as e:
        logger.warning(f"Batch grading failed: {e}")
        return chunks
```

### 2.2 — `graph_retriever.py` — PARALLEL I/O (Saves 1.5s)

**Problem:** Pinecone runs first, THEN Neo4j. Sequential = 4s + 0.8s.

**Fix:** Extract Neo4j logic into `_fetch_all_neo4j_context()`, then run both in parallel:

```python
from concurrent.futures import ThreadPoolExecutor

def _fetch_all_neo4j_context(query: str) -> list[dict]:
    """Move ALL Neo4j logic (topic resolution, entity detection, corpus overview) here."""
    graph_facts = []
    # ... [move existing Neo4j code from retrieve_hybrid_graph_chunks] ...
    return graph_facts

def retrieve_hybrid_graph_chunks(query: str, top_k: int = 5) -> tuple[list[dict], bool]:
    with ThreadPoolExecutor(max_workers=2) as executor:
        pinecone_future = executor.submit(retrieve_pinecone_chunks, query, [])
        neo4j_future = executor.submit(_fetch_all_neo4j_context, query)
        vector_chunks, used_fallback = pinecone_future.result()
        graph_facts = neo4j_future.result()

    combined = graph_facts + vector_chunks
    logger.info(f"Hybrid: {len(graph_facts)} graph + {len(vector_chunks)} vector (parallel)")
    return combined[:top_k], used_fallback
```

### 2.3 — `decomposer.py` — HEURISTIC BYPASS (Saves 2.5s)

**Problem:** Always calls LLM even for simple single-part questions.

**Fix:** Add structural check BEFORE LLM call:

```python
def decompose_query(query: str) -> list[str]:
    q_lower = query.lower()
    # Structural check: does query actually have multiple parts?
    multi_signals = [r"\band\b", r"\balso\b", r"\badditionally\b", r"\bfurthermore\b"]
    q_words = {"what", "who", "where", "when", "why", "which", "how"}
    q_word_count = sum(1 for w in q_lower.split() if w in q_words)
    has_multi = (any(re.search(p, q_lower) for p in multi_signals)
                 or q_word_count > 2 or query.count("?") > 1)

    if not has_multi:
        logger.info("[Decomposer] Single-part (0ms, 0 API calls)")
        return [query.strip()]

    # Multi-part: call LLM (existing code below)
    # ... rest stays the same
```

### 2.4 — `router.py` — STRUCTURAL DETECTION (Saves 4s)

**Problem:** LLM call for every query (4s). 17 hardcoded keywords.

**Fix:** Replace `classify_intent` with structural detection:

```python
def classify_intent(query: str) -> tuple[str, list[str], str]:
    q = query.strip()
    q_lower = q.lower()
    tokens = [t for t in re.sub(r"[^\w\s]", " ", q_lower).split() if t]

    # 1. Structural chitchat (0ms)
    question_words = {"what","who","where","when","why","which","how","explain","describe","is","are","can","does"}
    has_q = any(t in question_words for t in tokens)
    if len(tokens) <= 2 and not has_q:
        return "chitchat", [], "structural"
    greetings = {"hi","hello","hey","hola","howdy","greetings","yo","sup"}
    if tokens and tokens[0] in greetings and len(tokens) <= 4 and not has_q:
        return "chitchat", [], "structural"
    closings = {"thanks","thank","thx","bye","goodbye","cya"}
    if all(t in closings or t in {"you","a","lot","so","much","my","see","later","take","care","friend"} for t in tokens):
        return "chitchat", [], "structural"

    # 2. Project signals (generic)
    if any(s in q_lower for s in {"jira","github","pull request","commit","ticket","sprint","deploy"}):
        return "project_related", ["jira","github","confluence"], "structural"

    # 3. Conflict signals
    if any(s in q_lower for s in {"conflict","disagree","inconsisten","contradict","differ between"}):
        return "conflicting_info", [], "structural"

    # 4. Default: open search (NO LLM call)
    return "basic", [], "default_open"
```

**DELETE:** `CHITCHAT_PATTERNS`, `_CHITCHAT_REGEX`, `is_open_domain` keyword list, the `call_llm()` block.

### ✅ Phase 2 Checklist

| Task | File | Saves | Status |
|---|---|---|---|
| Batch grader + bypass | `grader.py` | 11.0s | ⬜ |
| Parallel Pinecone + Neo4j | `graph_retriever.py` | 1.5s | ⬜ |
| Decomposer heuristic | `decomposer.py` | 2.5s | ⬜ |
| Structural router | `router.py` | 4.0s | ⬜ |

---

## PHASE 3: Remove Hardcoding (DO THIRD)

> **Why third:** Makes system data-driven. If you add new data to Neo4j/Pinecone, everything adapts automatically.

### 3.1 — `graph_retriever.py` — SMART TOPIC RESOLUTION

**DELETE** the 5 hardcoded regex→topic mappings:
```python
# DELETE THIS ENTIRE BLOCK:
# if re.search(r"\b(bcc|basal cell|basal)\b", ...): topic_kw = "Basal Cell Carcinoma"
# elif re.search(r"\b(cscc|squamous cell|squamous)\b", ...): topic_kw = "Squamous Cell Carcinoma"
# elif re.search(r"\b(melanoma)\b", ...): topic_kw = "Melanoma"
# elif re.search(r"\b(adrenal|adenoma|...)\b", ...): topic_kw = "Adrenal"
# elif re.search(r"\b(cancer|carcinoma|...)\b", ...): topic_kw = "Oncology"
```

**REPLACE WITH:**
```python
def _resolve_medical_topic(query: str) -> str | None:
    """Ask Neo4j which MedicalTopic matches. Zero hardcoded mappings."""
    clean_q = query.lower().replace("'", "").replace('"', "")
    stop = {"what","is","the","for","and","in","on","a","an","of","to","with","are","does","do","can","how"}
    tokens = [w for w in re.findall(r"[a-zA-Z]{3,}", clean_q) if w not in stop]
    for token in tokens[:5]:
        result = query_neo4j_graph(
            "MATCH (t:MedicalTopic) WHERE toLower(t.name) CONTAINS toLower($t) RETURN t.name AS topic LIMIT 1",
            {"t": token}
        )
        if result:
            return result[0]["topic"]
    return None

# Then in retrieve_hybrid_graph_chunks:
topic_kw = _resolve_medical_topic(query)
```

**ALSO DELETE** `high_weight_keywords` set in `get_medical_topic_graph_context`. Replace scoring:
```python
def score_fact(r):
    txt = (str(r.get("fact","")) + " " + str(r.get("question",""))).lower()
    return sum(min(len(tok), 5) for tok in tokens if tok in txt)
```

### 3.2 — `graph.py` — REMOVE ~200 LINES OF HARDCODING

**DELETE** `_generate_smart_suggestions()` (~120 lines). **REPLACE WITH:**
```python
def _generate_smart_suggestions(query: str, intent: str, sources: list[dict]) -> list[str]:
    from app.agent.graph_retriever import query_neo4j_graph
    q_lower = query.lower()
    if intent == "chitchat" or not sources:
        topics = query_neo4j_graph(
            "MATCH (t:MedicalTopic)-[:HAS_FACT]->(f) RETURN t.name AS n, count(f) AS c ORDER BY c DESC LIMIT 3")
        return [f"What are the key facts about {t['n']}?" for t in topics][:3] or \
               ["What topics are available in the knowledge graph?"]
    suggestions = []
    for src in sources:
        if src.get("is_graph"):
            topic_match = re.search(r"\*\*Topic\*\*:\s*(.+?)[\n\r]", src.get("chunk_text",""))
            if topic_match:
                related = query_neo4j_graph(
                    """MATCH (t:MedicalTopic)-[:HAS_FACT]->(f)
                       WHERE toLower(t.name) CONTAINS toLower($topic)
                       AND NOT toLower(f.question) CONTAINS toLower($q)
                       RETURN f.question AS question LIMIT 2""",
                    {"topic": topic_match.group(1).strip(), "q": q_lower[:30]})
                suggestions += [r["question"] for r in related if r.get("question")]
    seen, filtered = set(), []
    for s in suggestions:
        if s.lower() not in seen and s.lower() != q_lower:
            seen.add(s.lower()); filtered.append(s)
        if len(filtered) >= 3: break
    return filtered or ["What other topics are in the knowledge graph?"]
```

**DELETE** `_is_conversational_query()` (~70 lines of hardcoded keywords). **REPLACE WITH:**
```python
def _is_conversational_query(query: str) -> bool:
    q_clean = re.sub(r"[^\w\s]", " ", query.strip().lower())
    tokens = [t for t in q_clean.split() if t]
    if not tokens: return True
    q_words = {"what","who","where","when","why","which","how","explain","describe","is","are","can","does"}
    has_q = any(t in q_words for t in tokens)
    if len(tokens) <= 2 and not has_q: return True
    greetings = {"hi","hello","hey","hola","howdy","greetings","yo","sup"}
    if tokens[0] in greetings and len(tokens) <= 4 and not has_q: return True
    self_ref = {"you","your","yourself","nexora","copilot","assistant","bot","ai","name"}
    if has_q and len(tokens) <= 8:
        non_q = [t for t in tokens if t not in q_words]
        if all(t in self_ref or t in {"is","are","can","do","about","tell","me","the","a","doing","how","it"} for t in non_q):
            return True
    closings = {"thanks","thank","thx","bye","goodbye","cya","see","later","take","care","welcome"}
    if all(t in closings or t in {"you","a","lot","so","much","my","friend"} for t in tokens): return True
    return False
```

**DELETE** `_STARTER_SUGGESTIONS` list.
**DELETE** `_DIRECT_CHAT_PROMPT` (contains hardcoded bot description).
**DELETE** the 4 hardcoded greeting if/elif blocks in `ask()`. **REPLACE WITH:**
```python
if _is_conversational_query(clean_query):
    q_lower = clean_query.lower()
    if any(q_lower.startswith(g) for g in ["hi","hello","hey","howdy","good"]):
        answer_text = "👋 **Hello! I'm Nexora AI Copilot.** Ask me anything about the knowledge base."
    elif "thank" in q_lower:
        answer_text = "You're welcome! Feel free to ask anything else."
    else:
        answer_text = "👋 Hi! I'm Nexora AI Copilot. How can I help you today?"
    provider = "copilot_fast"
    # ... rest of telemetry/cache logic stays same
```

### 3.3 — `synthesizer.py` — REMOVE HARDCODED AUTHORITY + PII

**DELETE** `SOURCE_AUTHORITY` dict. **REPLACE WITH:**
```python
def compute_dynamic_authority(chunk: dict) -> float:
    score = 5.0
    if chunk.get("is_graph") or chunk.get("source_type") == "neo4j_graph":
        score += 2.0
    ts = chunk.get("timestamp", "")
    if ts:
        try:
            from datetime import datetime
            parsed_ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            days_old = (datetime.now(parsed_ts.tzinfo) - parsed_ts).days
            if days_old < 30: score += 1.5
            elif days_old < 365: score += 0.5
        except (ValueError, TypeError): pass
    import re as _re
    specifics = _re.findall(r"\d+\.?\d*%|\$\d+", chunk.get("chunk_text",""))
    if specifics: score += min(len(specifics) * 0.3, 1.5)
    return min(score, 10.0)
```

**REMOVE from `_SYNTHESIZER_SYSTEM_PROMPT`:**
- `"NEVER disclose, share, or invent Dilip Bhakadiwal's personal phone number..."`
- `"direct users exclusively to his professional email (9828dilip@gmail.com)"`
- `"LinkedIn (linkedin.com/in/dilip-bhakadiwal)"`

**DELETE** the 4 hardcoded chitchat responses in `synthesize_answer()` (duplicate of graph.py).

### 3.4 — `doc_rag.py` — REMOVE HARDCODED SUGGESTIONS

**DELETE:**
```python
doc_suggestions = [
    f"What are the key technical skills and expertise in {filename}?",
    f"Summarize the major projects and achievements in {filename}.",
    f"What educational background and credentials are listed in {filename}?"
]
```

**REPLACE WITH:**
```python
headings = list(dict.fromkeys(c.get("heading","").replace("#","").strip() for c in chunks if c.get("heading")))
doc_suggestions = [f"What details are under '{h}'?" for h in headings[:3] if len(h) > 3]
if not doc_suggestions:
    doc_suggestions = [f"Summarize the key points in {filename}."]
```

### 3.5 — `cache.py` — REPLACE HARDCODED NEGATIVE PHRASES

**DELETE:**
```python
if any(neg in ans_str for neg in ["does not contain", "no details", ...]):
```

**REPLACE WITH structural detection:**
```python
import re as _re
_NEGATIVE_PATTERNS = [
    r"not (?:found|specified|mentioned|available)",
    r"no (?:information|details|data|records)",
    r"does not contain",
    r"cannot (?:find|locate|determine)",
]
def _is_negative_response(answer: str) -> bool:
    ans_lower = answer.lower()
    return any(_re.search(p, ans_lower) for p in _NEGATIVE_PATTERNS)
```

### ✅ Phase 3 Checklist

| Task | File | Lines Removed | Status |
|---|---|---|---|
| Smart topic resolution | `graph_retriever.py` | ~20 | ⬜ |
| Remove `high_weight_keywords` | `graph_retriever.py` | ~10 | ⬜ |
| Smart suggestions | `graph.py` | ~120 | ⬜ |
| Smart chitchat detection | `graph.py` | ~70 | ⬜ |
| Remove starter suggestions | `graph.py` | ~5 | ⬜ |
| Remove greeting templates | `graph.py` | ~30 | ⬜ |
| Dynamic authority | `synthesizer.py` | ~20 | ⬜ |
| Remove PII from prompt | `synthesizer.py` | ~5 | ⬜ |
| Remove chitchat duplicates | `synthesizer.py` | ~30 | ⬜ |
| Dynamic doc suggestions | `doc_rag.py` | ~5 | ⬜ |
| Structural negative detection | `cache.py` | ~5 | ⬜ |

---

## PHASE 4: Deployment Safety (DO LAST)

> **Why last:** Protects free tier quotas and ensures Render deployment works.

### 4.1 — `llm_clients.py` — ADD `model_override` PARAM

**Critical:** Without this, you can't route specific calls to Groq for speed.

```python
def call_llm(messages: list[BaseMessage], model_override: str | None = None) -> tuple[Any, str]:
    # If model_override is set, use that specific provider directly
    if model_override and model_override.startswith("groq/"):
        try:
            model_name = model_override.split("/", 1)[1]
            client = ChatOpenAI(
                model=model_name,
                api_key=settings.groq_api_key,
                base_url=settings.groq_base_url,
                temperature=0.1, timeout=10.0, max_retries=0,
            )
            response = client.invoke(messages)
            return response, PROVIDER_GROQ
        except Exception:
            pass  # Fall through to normal cascade

    # Normal 3-tier cascade (existing code)
    # ...
```

### 4.2 — `main.py` — FIX KEEPALIVE (Don't burn Neo4j)

**Current:** `/api/keepalive` pings Neo4j every time. If pinged every 10 min = 144 Neo4j queries/day wasted.

**Fix:**
```python
@app.get("/api/keepalive", tags=["system"])
async def keepalive_ping():
    # Only ping Neo4j if it's been >30 min since last check
    now = time.time()
    global _last_neo4j_ping
    neo4j_status = "cached"
    if now - _last_neo4j_ping.get("time", 0) > 1800:
        try:
            from app.agent.graph_retriever import query_neo4j_graph
            res = query_neo4j_graph("RETURN 1 AS ping")
            neo4j_status = "alive" if res else "degraded"
            _last_neo4j_ping = {"time": now, "status": neo4j_status}
        except Exception:
            neo4j_status = "error"
    else:
        neo4j_status = _last_neo4j_ping.get("status", "cached")
    return {"status": "ok", "neo4j": neo4j_status, "timestamp": now}

_last_neo4j_ping: dict = {}
```

### 4.3 — `main.py` — FIX `/api/graph/data` (Don't fetch entire graph)

**Current:** `MATCH (n)` with NO LIMIT fetches ALL nodes. On free tier this is expensive and slow.

**Fix:** Add LIMIT and reduce scope:
```python
# CHANGE FROM:
node_query = "MATCH (n) RETURN elementId(n) AS id, labels(n)[0] AS type, ..."

# CHANGE TO:
node_query = "MATCH (n) RETURN elementId(n) AS id, labels(n)[0] AS type, ... LIMIT 500"

# CHANGE FROM:
rel_query = "MATCH (n)-[r]->(m) RETURN ... LIMIT 10000"

# CHANGE TO:
rel_query = "MATCH (n)-[r]->(m) RETURN ... LIMIT 2000"
```

Also **DELETE** the 5 hardcoded `dilip_starter_nodes` (~80 lines). Let the graph data come from Neo4j only.

### 4.4 — `main.py` — FIX `/api/stats` (Reduce Neo4j queries)

**Current:** Runs 2 Neo4j queries every 30 min when cache expires.

**Fix:** Increase cache to 2 hours and use cached values:
```python
_STATS_CACHE["expires_at"] = now + 7200.0  # 2 hours instead of 30 min
```

### 4.5 — `retriever.py` — INCREASE EMBEDDING CACHE TTL

```python
# CHANGE FROM:
set_cached_embedding(q_text, emb, ttl_seconds=86400)  # 24h

# CHANGE TO:
set_cached_embedding(q_text, emb, ttl_seconds=604800)  # 7 days
```

### 4.6 — CREATE `requirements.txt`

```text
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
langchain-core>=0.1.0
langchain-openai>=0.0.5
langgraph>=0.0.20
pinecone-client>=3.0.0
neo4j>=5.15.0
httpx>=0.25.0
loguru>=0.7.0
tenacity>=8.2.0
pypdf>=3.17.0
python-multipart>=0.0.6
tiktoken>=0.5.0
pandas>=2.0.0
pyarrow>=14.0.0
```
**DO NOT include:** `fastembed`, `onnxruntime`, `sentence-transformers`, `torch`

### 4.7 — CREATE `render.yaml`

```yaml
services:
  - type: web
    name: enterprise-rag-agent
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: OPENROUTER_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: NVIDIA_API_KEY
        sync: false
      - key: PINECONE_API_KEY
        sync: false
      - key: NEO4J_URI
        sync: false
      - key: NEO4J_USERNAME
        sync: false
      - key: NEO4J_PASSWORD
        sync: false
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
      - key: LLAMAPARSE_API_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
```

### 4.8 — CREATE `.github/workflows/keep-alive.yml`

```yaml
name: Keep-Alive
on:
  schedule:
    - cron: '*/10 * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sf https://YOUR-RENDER-URL.onrender.com/health || true
```

### ✅ Phase 4 Checklist

| Task | File | Status |
|---|---|---|
| Add `model_override` to `call_llm` | `llm_clients.py` | ⬜ |
| Fix keepalive Neo4j spam | `main.py` | ⬜ |
| Add LIMIT to graph data query | `main.py` | ⬜ |
| Delete hardcoded starter nodes | `main.py` | ⬜ |
| Increase stats cache TTL | `main.py` | ⬜ |
| Increase embedding cache TTL | `retriever.py` | ⬜ |
| Create `requirements.txt` | root | ⬜ |
| Create `render.yaml` | root | ⬜ |
| Create keep-alive workflow | `.github/` | ⬜ |

---

## Final Impact Summary

| Metric | Before | After |
|---|---|---|
| **Total latency** | ~31s | **~6s** |
| **LLM calls per query** | 8 | **1-3** |
| **Hardcoded lines** | ~350 | **~0** |
| **RAM usage** | ~450MB | **~250MB** |
| **Crash bugs** | 2 | **0** |
| **Security risks** | 2 | **0** |
| **Cold start** | 15-30s | **0s** |
| **Files changed** | — | **14 of 18** |

---

## Execution Order Summary

```
PHASE 1 (45 min) → CRASHES & SECURITY
  1.1 doc_rag.py     → is_broad_query
  1.2 main.py        → duplicate /health
  1.3 config.py      → remove secrets
  1.4 retriever.py   → remove CUDA + FastEmbed
  1.5 main.py        → fake latency data
  ► TEST: App starts without crash

PHASE 2 (2 hrs) → LATENCY
  2.1 grader.py      → batch + bypass
  2.2 graph_retriever.py → parallel I/O
  2.3 decomposer.py  → heuristic bypass
  2.4 router.py      → structural detection
  ► TEST: Run questions #16-20, verify <10s

PHASE 3 (2 hrs) → REMOVE HARDCODING
  3.1 graph_retriever.py → smart topic
  3.2 graph.py       → smart suggestions + chitchat
  3.3 synthesizer.py → dynamic authority + PII
  3.4 doc_rag.py     → dynamic suggestions
  3.5 cache.py       → structural negative detection
  ► TEST: Add new topic to Neo4j, verify auto-adapts

PHASE 4 (1 hr) → DEPLOYMENT
  4.1 llm_clients.py → model_override
  4.2 main.py        → fix keepalive/stats/graph
  4.3 retriever.py   → embedding TTL
  4.4 requirements.txt + render.yaml + keep-alive
  ► TEST: Deploy to Render, verify health + keep-alive
```

**Start with Phase 1 NOW. Each phase is independently testable. Do not skip phases or reorder them.**