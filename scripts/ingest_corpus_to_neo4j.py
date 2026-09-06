"""
scripts/ingest_corpus_to_neo4j.py
───────────────────────────────────
Custom Knowledge Graph Ingestion Script for the Corpus & Questions dataset:
  1. Creates schema constraints and indexes on AuraDB.
  2. Parses Novel entity-relation-entity triples (4,000+ triples).
  3. Parses Medical clinical knowledge facts and disease relationships.
  4. Ingests in optimized UNWIND batches into Neo4j AuraDB.
  5. Displays live progress and final graph verification statistics.

Usage:
    C:\\Users\\EXNOX\\Desktop\\project\\venv\\Scripts\\python.exe scripts/ingest_corpus_to_neo4j.py
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from neo4j import GraphDatabase
from app.config import settings

CORPUS_DIR = PROJECT_ROOT / "dataset" / "corpus"
QUESTIONS_DIR = PROJECT_ROOT / "dataset" / "questions"


def clean_text(text: str) -> str:
    """Clean whitespace and trailing periods."""
    t = re.sub(r"[\r\n\t]+", " ", str(text))
    return t.strip().rstrip(".")


def parse_triple(raw_triple: str) -> tuple[str, str, str] | None:
    """Extract (subject, relation, object) from string formatted like '(subj, rel, obj)'."""
    raw = clean_text(raw_triple)
    m = re.match(r"^\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)$", raw)
    if m:
        s, r, o = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        if s and r and o:
            return s, r, o
    return None


def run_ingestion():
    print("=" * 80)
    print("🕸️ NEXORA AI — CORPUS KNOWLEDGE GRAPH INGESTION (Neo4j AuraDB)")
    print(f"   Target URI: {settings.neo4j_uri} | User: {settings.neo4j_username}")
    print("=" * 80)

    # 1. Connect to AuraDB
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
            max_connection_lifetime=3600,
        )
        driver.verify_connectivity()
        print("  ✅ Successfully connected to Neo4j AuraDB!\n")
    except Exception as exc:
        print(f"  ❌ Cannot connect to Neo4j AuraDB: {exc}")
        return

    with driver.session() as session:
        # 2. Schema Constraints
        print("🛠️ [1/4] Establishing schema constraints and indexes...")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Corpus) REQUIRE c.name IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (m:MedicalTopic) REQUIRE m.name IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:MedicalFact) REQUIRE f.id IS UNIQUE;")
        print("  ✅ Schema constraints active.\n")

        # 3. Ingest Corpus Root Nodes
        print("📚 [2/4] Registering Corpus Roots...")
        corpus_records = []
        if (CORPUS_DIR / "medical.json").exists():
            med_data = json.loads((CORPUS_DIR / "medical.json").read_text(encoding="utf-8"))
            for item in med_data:
                corpus_records.append({"name": item.get("corpus_name", "Medical"), "domain": "Healthcare"})
        if (CORPUS_DIR / "novel.json").exists():
            nov_data = json.loads((CORPUS_DIR / "novel.json").read_text(encoding="utf-8"))
            for item in nov_data:
                corpus_records.append({"name": item.get("corpus_name", "Novel"), "domain": "Literature"})

        session.run("""
            UNWIND $batch AS item
            MERGE (c:Corpus {name: item.name})
            SET c.domain = item.domain
        """, batch=corpus_records)
        print(f"  ✅ Created {len(corpus_records)} Corpus nodes.\n")

        # 4. Ingest Novel Knowledge Triples
        nov_q_path = QUESTIONS_DIR / "novel_questions.json"
        if nov_q_path.exists():
            print("📖 [3/4] Parsing & Ingesting Novel Knowledge Triples...")
            nov_questions = json.loads(nov_q_path.read_text(encoding="utf-8"))
            
            novel_triples: list[dict] = []
            for q in nov_questions:
                src = q.get("source", "Novel")
                raw_triples = q.get("evidence_triple", [])
                
                # Handle single string or list of strings
                if isinstance(raw_triples, str):
                    raw_triples = [raw_triples]
                
                for t in raw_triples:
                    if isinstance(t, str):
                        parsed = parse_triple(t)
                        if parsed:
                            s, r, o = parsed
                            novel_triples.append({
                                "subject": s[:120],
                                "relation": r[:100],
                                "object": o[:120],
                                "source": src
                            })
                    elif isinstance(t, list):
                        for sub_t in t:
                            if isinstance(sub_t, str):
                                parsed = parse_triple(sub_t)
                                if parsed:
                                    s, r, o = parsed
                                    novel_triples.append({
                                        "subject": s[:120],
                                        "relation": r[:100],
                                        "object": o[:120],
                                        "source": src
                                    })

            print(f"  • Extracted {len(novel_triples):,} structured triples.")
            batch_size = 500
            for i in range(0, len(novel_triples), batch_size):
                batch = novel_triples[i : i + batch_size]
                session.run("""
                    UNWIND $batch AS t
                    MERGE (s:Entity {name: t.subject})
                    MERGE (o:Entity {name: t.object})
                    MERGE (s)-[r:RELATED_TO {relation: t.relation}]->(o)
                    WITH s, o, t
                    MATCH (c:Corpus {name: t.source})
                    MERGE (s)-[:MENTIONED_IN]->(c)
                """, batch=batch)
                print(f"    - Ingested {min(i + batch_size, len(novel_triples)):,}/{len(novel_triples):,} triples...", end="\r")
            print(f"\n  ✅ Novel Knowledge Triples ingestion complete!\n")

        # 5. Ingest Medical Knowledge Facts & Relations
        med_q_path = QUESTIONS_DIR / "medical_questions.json"
        if med_q_path.exists():
            print("🩺 [4/4] Parsing & Ingesting Medical Knowledge Facts...")
            med_questions = json.loads(med_q_path.read_text(encoding="utf-8"))
            
            med_facts: list[dict] = []
            for q in med_questions:
                qid = q.get("id", "")
                qtype = q.get("question_type", "Fact Retrieval")
                question_text = q.get("question", "")
                answer_text = q.get("answer", "")
                ev_rel = q.get("evidence_relations")
                
                # Determine primary topic
                q_lower = (question_text + " " + answer_text).lower()
                topic = "General Medicine"
                if "basal cell" in q_lower or "bcc" in q_lower:
                    topic = "Basal Cell Carcinoma (BCC)"
                elif "squamous cell" in q_lower or "cscc" in q_lower:
                    topic = "Squamous Cell Carcinoma (CSCC)"
                elif "adrenal" in q_lower:
                    topic = "Adrenal Tumors & Endocrinology"
                elif "melanoma" in q_lower:
                    topic = "Melanoma & Skin Pathology"
                elif "cancer" in q_lower or "tumor" in q_lower:
                    topic = "Oncology"

                # Extract relations list
                facts_list = []
                if isinstance(ev_rel, list):
                    facts_list.extend([clean_text(f) for f in ev_rel if f])
                elif isinstance(ev_rel, str) and ev_rel:
                    facts_list.append(clean_text(ev_rel))
                elif answer_text:
                    facts_list.append(clean_text(answer_text))

                for f_idx, fact_str in enumerate(facts_list):
                    med_facts.append({
                        "id": f"{qid}_{f_idx}",
                        "topic": topic,
                        "fact": fact_str[:500],
                        "question": question_text[:300],
                        "type": qtype,
                        "source": "Medical"
                    })

            print(f"  • Extracted {len(med_facts):,} clinical medical knowledge statements.")
            batch_size = 500
            for i in range(0, len(med_facts), batch_size):
                batch = med_facts[i : i + batch_size]
                session.run("""
                    UNWIND $batch AS mf
                    MERGE (t:MedicalTopic {name: mf.topic})
                    MERGE (f:MedicalFact {id: mf.id})
                    SET f.text = mf.fact,
                        f.question = mf.question,
                        f.type = mf.type
                    MERGE (t)-[:HAS_FACT]->(f)
                    WITH t
                    MATCH (c:Corpus {name: 'Medical'})
                    MERGE (t)-[:BELONGS_TO]->(c)
                """, batch=batch)
                print(f"    - Ingested {min(i + batch_size, len(med_facts)):,}/{len(med_facts):,} medical facts...", end="\r")
            print(f"\n  ✅ Medical Knowledge Facts ingestion complete!\n")

        # 6. Verification and Summary
        nodes_cnt = session.run("MATCH (n) RETURN count(n) AS cnt").single()["cnt"]
        edges_cnt = session.run("MATCH ()-[r]->() RETURN count(r) AS cnt").single()["cnt"]
        
        print("=" * 80)
        print("🎉 NEO4J AURA KNOWLEDGE GRAPH INGESTION COMPLETE!")
        print(f"📊 Total Nodes in AuraDB         : {nodes_cnt:,}")
        print(f"🔗 Total Relationships in AuraDB : {edges_cnt:,}")
        print("=" * 80)

    driver.close()


if __name__ == "__main__":
    t0 = time.time()
    run_ingestion()
    print(f"⏱️ Finished in {time.time() - t0:.2f} seconds.")
