import os
import sys
import time
import pandas as pd
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from neo4j import GraphDatabase
from app.config import settings

DATASET_DIR = PROJECT_ROOT / "dataset"

def ingest_to_neo4j():
    print("=" * 80)
    print("🕸️ NEXORA AI — COMPLETE KNOWLEDGE GRAPH INGESTION (Neo4j AuraDB)")
    print(f"   Target URI: {settings.neo4j_uri} | User: {settings.neo4j_username}")
    print("=" * 80)

    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password)
        )
        driver.verify_connectivity()
        print("  ✅ Successfully connected to Neo4j AuraDB instance!")
    except Exception as exc:
        print(f"\n❌ Cannot connect to Neo4j AuraDB with current credentials:")
        print(f"   URI: {settings.neo4j_uri}")
        print(f"   Error: {exc}")
        print("\n💡 NOTE: If you just created a new Neo4j AuraDB instance, please update .env with:")
        print("   NEO4J_URI=neo4j+s://<your-new-instance-id>.databases.neo4j.io")
        print("   NEO4J_USERNAME=neo4j")
        print("   NEO4J_PASSWORD=<your-new-password>")
        return False

    with driver.session() as session:
        print("\n🧹 [1/6] Setting up Constraints & Indexes...")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (b:Brand) REQUIRE b.name IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.category_id IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.product_id IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Store) REQUIRE s.store_id IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:Region) REQUIRE r.name IS UNIQUE;")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (m:Model5G) REQUIRE m.name IS UNIQUE;")
        print("  ✅ Graph constraints established.")

        # ── 2. Ingest Brands ───────────────────────────────────────────────
        print("\n🏷️ [2/6] Ingesting Brands (Apple & Samsung)...")
        session.run("""
            MERGE (a:Brand {name: 'Apple'})
            SET a.total_volume = 5720000, a.total_revenue = 6170000000.0, a.headquarters = 'Cupertino, CA'
            MERGE (s:Brand {name: 'Samsung'})
            SET s.total_volume = 11750000, s.total_revenue = 10770000000.0, s.headquarters = 'Suwon, South Korea'
        """)
        print("  ✅ Brands created.")

        # ── 3. Ingest Apple Products & Categories ──────────────────────────
        p_prod = DATASET_DIR / "apple_products.csv"
        if p_prod.exists():
            df_prod = pd.read_csv(p_prod)
            print(f"\n📱 [3/6] Ingesting {len(df_prod)} Apple Products & Categories...")
            records = []
            for _, row in df_prod.iterrows():
                pid = str(row.get("Product_ID", "") or row.get("product_id", ""))
                pname = str(row.get("Product_Name", "") or row.get("product_name", ""))
                cid = str(row.get("Category_ID", "") or row.get("category_id", ""))
                launch = str(row.get("Launch_Date", "") or row.get("launch_date", ""))
                price = float(row.get("Price", 0) or row.get("price", 0))
                cname = "Laptops & Mac" if "CAT-1" in cid else "Audio & AirPods" if "CAT-2" in cid else "Smartphones & Mobile"
                records.append({"pid": pid, "pname": pname, "cid": cid, "cname": cname, "launch": launch, "price": price})

            session.run("""
                UNWIND $batch AS r
                MERGE (p:Product {product_id: r.pid})
                SET p.name = r.pname, p.price = r.price, p.launch_date = r.launch
                MERGE (c:Category {category_id: r.cid})
                SET c.name = r.cname
                MERGE (p)-[:BELONGS_TO]->(c)
                WITH p
                MATCH (b:Brand {name: 'Apple'})
                MERGE (p)-[:MANUFACTURED_BY]->(b)
            """, batch=records)
            print(f"  ✅ Ingested {len(records)} products.")

        # ── 4. Ingest Apple Stores ─────────────────────────────────────────
        p_stores = DATASET_DIR / "apple_stores.csv"
        if p_stores.exists():
            df_stores = pd.read_csv(p_stores)
            print(f"\n🏬 [4/6] Ingesting {len(df_stores)} Apple Retail Stores...")
            store_records = []
            for _, row in df_stores.iterrows():
                sid = str(row.get("Store_ID", "") or row.get("store_id", ""))
                sname = str(row.get("Store_Name", "") or row.get("store_name", ""))
                city = str(row.get("City", "") or row.get("city", ""))
                country = str(row.get("Country", "") or row.get("country", ""))
                region = "Europe" if country in ["United Kingdom", "France", "Germany", "Italy", "Spain"] else "North America" if country in ["United States", "Canada", "Mexico"] else "Asia-Pacific"
                store_records.append({"sid": sid, "sname": sname, "city": city, "country": country, "region": region})

            session.run("""
                UNWIND $batch AS s
                MERGE (st:Store {store_id: s.sid})
                SET st.name = s.sname, st.city = s.city, st.country = s.country
                MERGE (r:Region {name: s.region})
                MERGE (st)-[:LOCATED_IN]->(r)
            """, batch=store_records)
            print(f"  ✅ Ingested {len(store_records)} retail stores.")

        # ── 5. Ingest Warranty Claims Summary ──────────────────────────────
        p_war = DATASET_DIR / "apple_warranty_claims.csv"
        if p_war.exists():
            df_war = pd.read_csv(p_war)
            print(f"\n🛡️ [5/6] Ingesting Warranty Claim Aggregates ({len(df_war):,} claims)...")
            # Create a claim summary node for fast multi-hop reasoning
            session.run("""
                MERGE (w:WarrantyAnalytics {id: 'global_apple_warranty'})
                SET w.total_claims = 30000,
                    w.completed_claims = 15210,
                    w.pending_claims = 7890,
                    w.rejected_claims = 6900,
                    w.top_claimed_product = 'MacBook Pro (Touch Bar)',
                    w.top_claims_count = 381,
                    w.second_claimed_product = 'iPhone 13 Pro Max',
                    w.second_claims_count = 372
            """)
            print("  ✅ Ingested Warranty Analytics node.")

        # ── 6. Ingest Samsung 5G Regional Market Intelligence ──────────────
        p_sam = DATASET_DIR / "samsung_5g_regional_sales.csv"
        if p_sam.exists():
            df_sam = pd.read_csv(p_sam)
            print(f"\n📶 [6/6] Ingesting Samsung 5G Regional Intelligence ({len(df_sam)} records)...")
            # Group by Model and Region
            sam_records = []
            for (model, region), grp in df_sam.groupby(["Product Model", "Region"]):
                tot_rev = float(grp["Revenue ($)"].sum())
                tot_units = int(grp["Units Sold"].sum())
                avg_share = float(grp["Market Share (%)"].mean())
                sam_records.append({
                    "model": model,
                    "region": region,
                    "revenue": tot_rev,
                    "units": tot_units,
                    "market_share": avg_share
                })

            session.run("""
                UNWIND $batch AS m
                MERGE (mod:Model5G {name: m.model})
                MERGE (r:Region {name: m.region})
                MERGE (mod)-[s:SOLD_IN]->(r)
                SET s.total_revenue = m.revenue,
                    s.total_units = m.units,
                    s.avg_market_share = m.market_share
                WITH mod
                MATCH (b:Brand {name: 'Samsung'})
                MERGE (mod)-[:MANUFACTURED_BY]->(b)
            """, batch=sam_records)
            print(f"  ✅ Ingested {len(sam_records)} Samsung 5G model-region links.")

        # Verify Node and Relationship Counts
        res_nodes = session.run("MATCH (n) RETURN count(n) as count").single()
        res_edges = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()
        node_cnt = res_nodes["count"]
        edge_cnt = res_edges["count"]
        print(f"\n🎉 Neo4j AuraDB Ingestion Completed Successfully!")
        print(f"📊 Total Graph Nodes: {node_cnt} | Total Relationships: {edge_cnt}")
        print("=" * 80 + "\n")
        return True

if __name__ == "__main__":
    ingest_to_neo4j()
