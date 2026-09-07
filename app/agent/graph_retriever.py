"""
app/agent/graph_retriever.py
────────────────────────────
Hybrid Knowledge Graph + Vector Retrieval Engine for Enterprise Sales Intelligence:
  1. Executes parameterized Cypher graph traversals on Neo4j AuraDB.
  2. Extracts candidate entities from user queries (Apple & Samsung products, stores, regions, categories).
  3. Fuses multi-hop Neo4j graph facts with Pinecone dense semantic vector chunks.
  4. Returns rich, structured context with graph relationship provenance.
"""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from loguru import logger
from neo4j import GraphDatabase, Driver

from app.config import settings
from app.agent.retriever import retrieve_chunks as retrieve_pinecone_chunks

# ── Singleton Neo4j Driver ─────────────────────────────────────────────────
_neo4j_driver: Driver | None = None


def get_graph_driver() -> Driver | None:
    """Get or create singleton Neo4j driver connection."""
    global _neo4j_driver
    if _neo4j_driver is None and settings.neo4j_password:
        try:
            _neo4j_driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
                max_connection_lifetime=3600,
                connection_timeout=3.0,
                max_connection_pool_size=10,
            )
            _neo4j_driver.verify_connectivity()
            logger.info("Neo4j AuraDB Graph Driver connected successfully.")
        except Exception as exc:
            logger.warning(f"Neo4j driver initialization fallback (AuraDB may be paused): {exc}")
            _neo4j_driver = None
    return _neo4j_driver


def query_neo4j_graph(cypher: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Execute a Cypher query against Neo4j AuraDB safely."""
    driver = get_graph_driver()
    if not driver:
        return []
    try:
        with driver.session() as session:
            result = session.run(cypher, params or {})
            return [record.data() for record in result]
    except Exception as exc:
        logger.warning(f"Cypher execution failed: {exc}")
        return []


# ── Specialized Graph Traversal Helpers ────────────────────────────────────

# ── Specialized Graph Traversal Helpers for GraphRAG-Bench ──────────────────

def get_medical_topic_graph_context(topic_name: str, query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    """
    Fetch clinical facts, symptoms, and guidelines for a specific medical topic.
    Ranks candidates by relevance to the query tokens so specific facts (e.g. surgery, rationale,
    diagnostic tests, hormones) are prioritized over arbitrary default facts.
    """
    cypher = """
    MATCH (t:MedicalTopic)
    WHERE toLower(t.name) CONTAINS toLower($topic)
    OPTIONAL MATCH (t)-[:HAS_FACT]->(f:MedicalFact)
    RETURN t.name AS topic, f.text AS fact, f.question AS question, f.type AS type
    LIMIT 500
    """
    records = query_neo4j_graph(cypher, {"topic": topic_name})
    if not records:
        return []

    # If query is provided, score and rank facts by keyword match
    if query:
        stop_words = {"what", "is", "the", "for", "and", "in", "on", "a", "an", "as", "of", "to", "with", "are"}
        tokens = [w for w in re.findall(r"[a-zA-Z]{3,}", query.lower()) if w not in stop_words]
        def score_fact(r: dict[str, Any]) -> int:
            txt = (str(r.get("fact") or "") + " " + str(r.get("question") or "")).lower()
            return sum(min(len(tok), 5) for tok in tokens if tok in txt)

        scored = [(score_fact(r), r) for r in records if r.get("fact")]
        scored.sort(key=lambda x: x[0], reverse=True)
        # Deduplicate facts by unique text
        unique_results = []
        seen_facts = set()
        for _, r in scored:
            f_txt = (r.get("fact") or "").strip().lower()
            if f_txt and f_txt not in seen_facts:
                seen_facts.add(f_txt)
                unique_results.append(r)
            if len(unique_results) >= limit:
                break
        return unique_results

    return records[:limit]


def get_entity_knowledge_graph_context(entity_name: str) -> list[dict[str, Any]]:
    """Traverse bidirectional multi-hop relationships for literature and named entities."""
    cypher = """
    MATCH (e:Entity)
    WHERE toLower(e.name) CONTAINS toLower($name)
    OPTIONAL MATCH (s:Entity)-[r:RELATED_TO]->(t:Entity)
    WHERE s = e OR t = e
    OPTIONAL MATCH (e)-[:MENTIONED_IN]->(c:Corpus)
    RETURN s.name AS subject, r.relation AS relation, t.name AS target, c.name AS corpus
    LIMIT 10
    """
    return query_neo4j_graph(cypher, {"name": entity_name})


def get_general_medical_facts(limit: int = 5) -> list[dict[str, Any]]:
    """Fetch representative clinical oncology and dermatology facts from AuraDB."""
    cypher = """
    MATCH (t:MedicalTopic)-[:HAS_FACT]->(f:MedicalFact)
    RETURN t.name AS topic, f.text AS fact, f.question AS question
    LIMIT $lim
    """
    return query_neo4j_graph(cypher, {"lim": limit})


def get_corpus_overview_graph_context() -> list[dict[str, Any]]:
    """Fetch corpus domain counts and knowledge graph volume."""
    cypher = """
    MATCH (c:Corpus)
    OPTIONAL MATCH (e:Entity)-[:MENTIONED_IN]->(c)
    RETURN c.name AS corpus, c.domain AS domain, count(DISTINCT e) AS entity_count
    LIMIT 8
    """
    return query_neo4j_graph(cypher)


# ── Hybrid Graph + Vector Search Orchestrator ──────────────────────────────

CLINICAL_INDICATORS = {
    "cancer", "tumor", "tumour", "carcinoma", "melanoma", "cscc", "bcc", "gist",
    "merkel", "adrenal", "biopsy", "radiation", "oncology", "lesion", "nodule",
    "chemotherapy", "mohs", "metastasis", "syndrome", "symptom", "erythematous",
    "plaque", "ulcerated", "excision", "recurrence", "staging", "dermatology",
    "clinical", "histology", "dermis", "epidermis", "cutaneous", "nevus", "nevi",
    "keratosis", "sunburn", "ultraviolet", "squamous", "basal", "shiny bump",
    "fair skin", "organ transplant", "adrenocortical"
}


def _resolve_medical_topic(query: str) -> str | None:
    """
    SMART Topic Resolution: Asks Neo4j to match query tokens against:
    1. MedicalTopic names (e.g. BCC, CSCC, Melanoma, Adrenal)
    2. MedicalFact text/questions (symptoms like 'shiny bump', risk factors like 'radiation', 'tanning bed')
    Only triggers if clinical indicators are present or a direct topic name matches.
    """
    clean_q = query.lower().replace("'", "").replace('"', "")

    # Guard: only attempt medical resolution if query has clinical relevance or direct topic match
    has_clinical_term = any(term in clean_q for term in CLINICAL_INDICATORS)

    # Strategy 1: Direct Topic Name Match (exact disease or acronym mention)
    words = [w for w in re.findall(r"[a-zA-Z]{3,}", clean_q)]
    for word in words:
        if len(word) < 4 and word.lower() not in {"bcc", "cscc", "gist"}:
            continue
        res = query_neo4j_graph(
            """
            MATCH (t:MedicalTopic)
            WHERE toLower(t.name) CONTAINS toLower($w)
              AND NOT t.name IN ['Oncology', 'General Medicine']
            RETURN t.name AS topic
            LIMIT 1
            """,
            {"w": word},
        )
        if res:
            return res[0]["topic"]

    # If no direct topic match and no clinical indicators, this is NOT a medical query
    if not has_clinical_term:
        return None

    # Strategy 2: N-gram symptom phrases & symptom tokens in MedicalFact text
    stop = {
        "what", "who", "where", "when", "why", "how", "might", "could", "would", 
        "should", "does", "have", "with", "from", "that", "this", "these", "those", 
        "patient", "patients", "history", "require", "both", "therapy", "treatment", 
        "guidelines", "general", "about", "which", "there", "their", "been", "also", 
        "than", "more", "most", "into", "over", "such", "some", "present", "presents",
        "taken", "steps", "differ", "initial", "factors", "prompt", "earlier", "frequent",
        "recommended", "follow", "strategy", "contribute", "development", "particularly",
        "vigilant", "changes", "overall", "refer", "refers", "managed", "manage", "risk",
        "skin", "cell", "exam", "exams", "cancer"
    }
    filtered_words = [w for w in words if w not in stop]
    candidates = []
    for i in range(len(filtered_words) - 1):
        candidates.append(f"{filtered_words[i]} {filtered_words[i+1]}")
    candidates.extend(filtered_words)

    for cand in candidates:
        res = query_neo4j_graph(
            """
            MATCH (t:MedicalTopic)-[:HAS_FACT]->(f:MedicalFact)
            WHERE (toLower(f.text) CONTAINS toLower($cand) OR toLower(f.question) CONTAINS toLower($cand))
              AND NOT t.name IN ['Oncology', 'General Medicine']
            RETURN t.name AS topic, count(f) AS relevance
            ORDER BY relevance DESC
            LIMIT 1
            """,
            {"cand": cand},
        )
        if res:
            return res[0]["topic"]

    # Only fallback to oncology if query explicitly mentions oncology/cancer
    if "oncology" in clean_q or "cancer" in clean_q:
        res = query_neo4j_graph(
            "MATCH (t:MedicalTopic) WHERE toLower(t.name) CONTAINS 'oncology' RETURN t.name AS topic LIMIT 1"
        )
        return res[0]["topic"] if res else None

    return None


def _fetch_all_neo4j_context(query: str) -> list[dict[str, Any]]:
    """Fetch all relevant Neo4j graph facts for a query."""
    graph_facts: list[dict[str, Any]] = []
    clean_q = query.lower().replace("'", "").replace('"', "")

    # ── GraphRAG-Bench: Medical Clinical Topic & Facts Resolver ──
    topic_kw = _resolve_medical_topic(query)

    if topic_kw:
        med_records = get_medical_topic_graph_context(topic_kw, query=query, limit=12)
        if not med_records:
            med_records = get_general_medical_facts(limit=4)
        for idx, m in enumerate(med_records, 1):
            t_name = m.get("topic", "Clinical Oncology")
            fact_txt = m.get("fact", "")
            q_txt = m.get("question", "")
            graph_facts.append({
                "doc_id": f"neo4j_medical_{idx}_{t_name.lower().replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: {t_name}\n"
                    f"- **Topic**: {t_name}\n"
                    f"- **Clinical Fact**: {fact_txt}\n"
                    f"- **Associated Question**: {q_txt}"
                ),
                "source_type": "neo4j_graph",
                "category": "Medical Intelligence",
                "authority": 10,
                "score": 0.99,
                "is_graph": True,
                "cypher_preview": f"MATCH (t:MedicalTopic)-[:HAS_FACT]->(f:MedicalFact)\nWHERE toLower(t.name) CONTAINS toLower('{topic_kw}')\nRETURN t.name, f.text LIMIT 5;",
            })

    # ── GraphRAG-Bench: Literature Entity Triples Resolver ──
    ent_nodes = query_neo4j_graph(
        """
        MATCH (e:Entity)
        WHERE size(e.name) >= 3 AND $clean_q CONTAINS toLower(e.name)
        RETURN e.name AS entity
        ORDER BY size(e.name) DESC
        LIMIT 6
        """,
        params={"clean_q": clean_q},
    )
    if ent_nodes:
        for e_entry in ent_nodes:
            e_name = e_entry.get("entity")
            if not e_name:
                continue
            e_context = get_entity_knowledge_graph_context(e_name)
            if e_context:
                relations_bullets = "\n".join(
                    f"  - **{ec.get('subject')}** -[{ec.get('relation')}]-> **{ec.get('target')}** (Corpus: {ec.get('corpus', 'Literature')})"
                    for ec in e_context if ec.get("target")
                )
                graph_facts.append({
                    "doc_id": f"neo4j_entity_{e_name.lower().replace(' ', '_')}",
                    "chunk_text": (
                        f"### Neo4j Knowledge Graph Fact: Literature Entity — {e_name}\n"
                        f"- **Entity Name**: {e_name}\n"
                        f"- **Connected Triples & Relationships**:\n{relations_bullets or '  - Mentioned in literature corpus.'}"
                    ),
                    "source_type": "neo4j_graph",
                    "category": "Literature Knowledge Graph",
                    "authority": 10,
                    "score": 0.99,
                    "is_graph": True,
                    "cypher_preview": f"MATCH (s:Entity {{name: '{e_name}'}})-[r:RELATED_TO]->(o:Entity)\nRETURN s.name, r.relation, o.name LIMIT 5;",
                })

    # ── GraphRAG-Bench: General Corpus Statistics Resolver ──
    if re.search(r"\b(corpus|dataset|benchmark|novels|books|medicine|overview|graph)\b", query, re.IGNORECASE) and not graph_facts:
        overview_records = get_corpus_overview_graph_context()
        if overview_records:
            stats_bullet = "\n".join(
                f"  - **{ov.get('corpus')}** ({ov.get('domain')}): {ov.get('entity_count', 0):,} connected graph entities"
                for ov in overview_records
            )
            graph_facts.append({
                "doc_id": "neo4j_corpus_overview",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: Corpus & Benchmark Distribution\n"
                    f"{stats_bullet}"
                ),
                "source_type": "neo4j_graph",
                "category": "Corpus Analytics",
                "authority": 10,
                "score": 0.98,
                "is_graph": True,
                "cypher_preview": "MATCH (c:Corpus)\nOPTIONAL MATCH (e:Entity)-[:MENTIONED_IN]->(c)\nRETURN c.name, count(e);",
            })

    return graph_facts


def retrieve_hybrid_graph_chunks(query: str, top_k: int = 6) -> tuple[list[dict[str, Any]], bool]:
    """
    Orchestrates Hybrid GraphRAG retrieval with Parallel I/O:
      - Runs Pinecone vector search and Neo4j graph context retrieval concurrently.
      - Merges balanced graph facts and semantic vector chunks.
    """
    with ThreadPoolExecutor(max_workers=2) as executor:
        pinecone_future = executor.submit(retrieve_pinecone_chunks, query=query, source_filter=[])
        neo4j_future = executor.submit(_fetch_all_neo4j_context, query)
        vector_chunks, used_fallback = pinecone_future.result()
        graph_facts = neo4j_future.result()

    # Balanced fusion: prioritize graph facts when present, complemented by vector chunks
    if graph_facts and vector_chunks:
        combined_chunks = graph_facts[:4] + vector_chunks[:4]
    elif graph_facts:
        combined_chunks = graph_facts[:top_k]
    else:
        combined_chunks = vector_chunks[:top_k]

    logger.info(
        f"Hybrid GraphRAG Retrieval: {len(graph_facts)} graph facts + {len(vector_chunks)} vector chunks merged ({len(combined_chunks)} delivered)."
    )

    return combined_chunks, used_fallback
