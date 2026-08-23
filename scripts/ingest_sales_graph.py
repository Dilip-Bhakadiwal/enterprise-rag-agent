"""
scripts/ingest_sales_graph.py
─────────────────────────────
High-Performance Ingestion Pipeline for Hybrid Agentic GraphRAG:
  1. Parses Apple Sales Ecosystem (Categories, Products, Stores, 1M Sales Aggregations, Warranty Claims)
  2. Parses Samsung Mobile Ecosystem (Quarterly 5G Market Share, Revenue, Units Sold, Regions)
  3. Builds Knowledge Graph in Neo4j AuraDB (Nodes & Relationships optimized for AuraDB Free Tier)
  4. Generates Dense Semantic Chunks and indexes into Pinecone Vector DB

Usage:
    python scripts/ingest_sales_graph.py
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any

import pandas as pd
from loguru import logger
from pinecone import Pinecone
from neo4j import GraphDatabase, Driver

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
SALES_DIR = BASE_DIR / "sales dataset"
APPLE_DIR = SALES_DIR / "apple sales"
SAMSUNG_DIR = SALES_DIR / "samsung sales"


def get_neo4j_driver() -> Driver | None:
    """Connect to Neo4j AuraDB."""
    if not settings.neo4j_password:
        logger.warning("NEO4J_PASSWORD not set in .env — skipping live Neo4j upload (local simulation mode)")
        return None
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
            max_connection_lifetime=3600,
        )
        driver.verify_connectivity()
        logger.info(f"Connected to Neo4j AuraDB successfully: {settings.neo4j_uri}")
        return driver
    except Exception as exc:
        logger.error(f"Failed to connect to Neo4j AuraDB: {exc}")
        return None


def get_pinecone_index():
    """Connect to Pinecone Vector Index."""
    pc = Pinecone(api_key=settings.pinecone_api_key)
    return pc.Index(settings.pinecone_index_name)


def load_datasets() -> dict[str, pd.DataFrame]:
    """Load all CSVs into pandas DataFrames."""
    logger.info("Loading Sales CSV datasets...")

    # Apple
    categories_df = pd.read_csv(APPLE_DIR / "category.csv")
    products_df = pd.read_csv(APPLE_DIR / "products.csv")
    stores_df = pd.read_csv(APPLE_DIR / "stores.csv")
    warranty_df = pd.read_csv(APPLE_DIR / "warranty.csv")
    
    logger.info("Loading Apple sales transactions (1M+ rows)...")
    sales_df = pd.read_csv(APPLE_DIR / "sales.csv")

    # Samsung
    samsung_df = pd.read_csv(SAMSUNG_DIR / "Expanded_Dataset.csv")

    logger.info(
        f"Data loaded: Categories={len(categories_df)}, Products={len(products_df)}, "
        f"Stores={len(stores_df)}, Sales={len(sales_df)}, Warranty={len(warranty_df)}, "
        f"Samsung Records={len(samsung_df)}"
    )

    return {
        "categories": categories_df,
        "products": products_df,
        "stores": stores_df,
        "sales": sales_df,
        "warranty": warranty_df,
        "samsung": samsung_df,
    }


def populate_neo4j_graph(driver: Driver, data: dict[str, pd.DataFrame]):
    """Populate Knowledge Graph nodes and relationships in Neo4j AuraDB."""
    logger.info("Starting Neo4j Knowledge Graph Construction...")

    categories_df = data["categories"]
    products_df = data["products"]
    stores_df = data["stores"]
    sales_df = data["sales"]
    warranty_df = data["warranty"]
    samsung_df = data["samsung"]

    with driver.session() as session:
        # 1. Clean existing graph (optional/safe update)
        logger.info("Initializing Neo4j schema & indexes...")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.id IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Store) REQUIRE s.id IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (b:Brand) REQUIRE b.name IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (r:Region) REQUIRE r.name IS UNIQUE")

        # 2. Create Brands
        logger.info("Creating Brands (Apple, Samsung)...")
        session.run("MERGE (b:Brand {name: 'Apple'})")
        session.run("MERGE (b:Brand {name: 'Samsung'})")

        # 3. Create Apple Categories
        logger.info("Creating Category Nodes...")
        for _, row in categories_df.iterrows():
            session.run(
                """
                MERGE (c:Category {id: $id})
                SET c.name = $name
                MERGE (b:Brand {name: 'Apple'})
                MERGE (b)-[:OFFERS_CATEGORY]->(c)
                """,
                id=str(row["category_id"]),
                name=str(row["category_name"]),
            )

        # 4. Create Apple Products & link to Category
        logger.info("Creating Apple Product Nodes & Category relationships...")
        for _, row in products_df.iterrows():
            session.run(
                """
                MERGE (p:Product {id: $id})
                SET p.name = $name,
                    p.launch_date = $launch_date,
                    p.price = $price,
                    p.brand = 'Apple'
                WITH p
                MATCH (c:Category {id: $cat_id})
                MERGE (p)-[:BELONGS_TO]->(c)
                """,
                id=str(row["Product_ID"]),
                name=str(row["Product_Name"]),
                launch_date=str(row["Launch_Date"]),
                price=float(row["Price"]),
                cat_id=str(row["Category_ID"]),
            )

        # 5. Create Stores, Cities, and Countries
        logger.info("Creating Store, City, Country Nodes & Geographical Edges...")
        for _, row in stores_df.iterrows():
            session.run(
                """
                MERGE (s:Store {id: $id})
                SET s.name = $name, s.city = $city, s.country = $country
                MERGE (c:City {name: $city})
                MERGE (co:Country {name: $country})
                MERGE (s)-[:LOCATED_IN]->(c)
                MERGE (c)-[:IN_COUNTRY]->(co)
                """,
                id=str(row["Store_ID"]),
                name=str(row["Store_Name"]),
                city=str(row["City"]),
                country=str(row["Country"]),
            )

        # 6. Aggregate Sales by Store & Product (Avoids 1M individual nodes, fits AuraDB)
        logger.info("Aggregating 1M+ sales records into Store-Product performance edges...")
        sales_agg = sales_df.groupby(["store_id", "product_id"])["quantity"].agg(["sum", "count"]).reset_index()
        sales_agg.columns = ["store_id", "product_id", "total_units", "transaction_count"]

        # Batch upsert aggregated sales edges
        batch_size = 500
        total_edges = len(sales_agg)
        for i in range(0, total_edges, batch_size):
            batch = sales_agg.iloc[i : i + batch_size].to_dict(orient="records")
            session.run(
                """
                UNWIND $batch AS item
                MATCH (s:Store {id: item.store_id})
                MATCH (p:Product {id: item.product_id})
                MERGE (s)-[r:SOLD_PRODUCT]->(p)
                SET r.total_units = item.total_units,
                    r.transaction_count = item.transaction_count,
                    r.revenue = item.total_units * p.price
                """,
                batch=batch,
            )

        # 7. Aggregate Warranty claims by product
        logger.info("Aggregating Warranty Claims by Product...")
        merged_warranty = warranty_df.merge(sales_df[["sale_id", "product_id"]], on="sale_id", how="left")
        w_agg = merged_warranty.groupby("product_id")["claim_id"].count().reset_index()
        w_agg.columns = ["product_id", "claim_count"]
        for _, row in w_agg.iterrows():
            if pd.notna(row["product_id"]):
                session.run(
                    """
                    MATCH (p:Product {id: $pid})
                    SET p.total_warranty_claims = $claims
                    """,
                    pid=str(row["product_id"]),
                    claims=int(row["claim_count"]),
                )

        # 8. Ingest Samsung Mobile Intelligence (Quarters, 5G, Revenue, Regions)
        logger.info("Creating Samsung Mobile Intelligence Nodes & Regional Performance...")
        for _, row in samsung_df.iterrows():
            session.run(
                """
                MERGE (p:Product {name: $model, brand: 'Samsung'})
                SET p.five_g_capable = $five_g
                MERGE (b:Brand {name: 'Samsung'})
                MERGE (b)-[:PRODUCES]->(p)
                MERGE (r:Region {name: $region})
                MERGE (q:Quarter {name: $quarter_year, year: $year, quarter: $quarter})
                MERGE (p)-[perf:PERFORMED_IN {quarter: $quarter_year, region: $region}]->(r)
                SET perf.units_sold = $units,
                    perf.revenue = $rev,
                    perf.market_share = $share,
                    perf.regional_5g_coverage = $coverage,
                    perf.subscribers_5g_m = $subs,
                    perf.avg_5g_speed = $speed
                """,
                model=str(row["Product Model"]),
                five_g=(str(row["5G Capability"]).strip().lower() == "yes"),
                region=str(row["Region"]),
                quarter_year=f"{row['Year']}-{row['Quarter']}",
                year=int(row["Year"]),
                quarter=str(row["Quarter"]),
                units=int(row["Units Sold"]),
                rev=float(row["Revenue ($)"]),
                share=float(row["Market Share (%)"]),
                coverage=float(row["Regional 5G Coverage (%)"]),
                subs=float(row["5G Subscribers (millions)"]),
                speed=float(row["Avg 5G Speed (Mbps)"]),
            )

    logger.info("Neo4j Knowledge Graph Construction Complete! 🎉")


def generate_semantic_documents(data: dict[str, pd.DataFrame]) -> list[dict[str, Any]]:
    """Generate high-quality semantic document chunks for Pinecone Vector Index."""
    logger.info("Generating semantic markdown documents for Pinecone indexing...")
    docs: list[dict[str, Any]] = []

    categories_df = data["categories"]
    products_df = data["products"]
    stores_df = data["stores"]
    samsung_df = data["samsung"]
    warranty_df = data["warranty"]
    sales_df = data["sales"]

    # 1. Apple Product & Category Knowledge Documents
    cat_map = dict(zip(categories_df["category_id"], categories_df["category_name"]))
    merged_prod = products_df.copy()
    merged_prod["Category_Name"] = merged_prod["Category_ID"].map(cat_map)

    for _, row in merged_prod.iterrows():
        p_id = str(row["Product_ID"])
        p_name = str(row["Product_Name"])
        c_name = str(row["Category_Name"])
        price = row["Price"]
        l_date = row["Launch_Date"]

        doc_text = f"""
# Apple Product Intelligence: {p_name} ({p_id})
- **Brand**: Apple
- **Category**: {c_name} ({row['Category_ID']})
- **MSRP Price**: ${price:,.2f} USD
- **Official Launch Date**: {l_date}
- **Overview**: The {p_name} is Apple's premier offering in the {c_name} ecosystem launched on {l_date}. Available globally across all 77 Apple flagship stores and authorized enterprise resellers.
"""
        docs.append({
            "id": f"apple_prod_{p_id}",
            "text": doc_text.strip(),
            "metadata": {
                "doc_id": f"apple_prod_{p_id}",
                "brand": "Apple",
                "source_type": "product_catalog",
                "category": c_name,
                "product_name": p_name,
                "price": float(price),
                "launch_date": str(l_date),
            }
        })

    # 2. Apple Global Retail Stores Documents
    for _, row in stores_df.iterrows():
        s_id = str(row["Store_ID"])
        s_name = str(row["Store_Name"])
        city = str(row["City"])
        country = str(row["Country"])

        doc_text = f"""
# Apple Flagship Retail Store: {s_name} ({s_id})
- **Store Identifier**: {s_id}
- **Official Name**: {s_name}
- **Location**: {city}, {country}
- **Operations**: Serves retail customers, enterprise business appointments, Genius Bar repairs, and authorized device trade-ins in {city}, {country}.
"""
        docs.append({
            "id": f"apple_store_{s_id}",
            "text": doc_text.strip(),
            "metadata": {
                "doc_id": f"apple_store_{s_id}",
                "brand": "Apple",
                "source_type": "store_directory",
                "store_name": s_name,
                "city": city,
                "country": country,
            }
        })

    # 3. Samsung 5G & Regional Market Summaries
    samsung_summary = samsung_df.groupby(["Product Model", "Region"])[["Units Sold", "Revenue ($)", "Market Share (%)", "Avg 5G Speed (Mbps)"]].mean().reset_index()
    for _, row in samsung_summary.iterrows():
        model = str(row["Product Model"])
        region = str(row["Region"])
        units = row["Units Sold"]
        rev = row["Revenue ($)"]
        share = row["Market Share (%)"]
        speed = row["Avg 5G Speed (Mbps)"]

        doc_text = f"""
# Samsung Mobile Market Intelligence: {model} in {region}
- **Brand**: Samsung
- **Product Model**: {model}
- **Geographic Region**: {region}
- **Quarterly Average Units Sold**: {units:,.0f} units
- **Average Quarterly Revenue**: ${rev:,.2f} USD
- **Average Regional Market Share**: {share:.2f}%
- **Average 5G Network Speed**: {speed:.1f} Mbps
- **Summary**: Market performance analysis for Samsung's {model} across {region}, tracking quarterly adoption, 5G carrier coverage, and consumer preference.
"""
        docs.append({
            "id": f"samsung_{model.replace(' ', '_')}_{region.replace(' ', '_')}",
            "text": doc_text.strip(),
            "metadata": {
                "doc_id": f"samsung_{model.replace(' ', '_')}_{region.replace(' ', '_')}",
                "brand": "Samsung",
                "source_type": "market_report",
                "product_model": model,
                "region": region,
                "revenue": float(rev),
                "market_share": float(share),
            }
        })

    logger.info(f"Generated {len(docs)} high-density semantic documents for Pinecone.")
    return docs


def _embed_passages_nvidia(texts: list[str]) -> list[list[float]]:
    """Embed passages via NVIDIA NIM (nvidia/nv-embedqa-e5-v5) with batching."""
    import httpx
    embeddings: list[list[float]] = []
    batch_size = 25
    total = len(texts)
    for i in range(0, total, batch_size):
        batch = texts[i : i + batch_size]
        response = httpx.post(
            "https://integrate.api.nvidia.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "input": batch,
                "model": "nvidia/nv-embedqa-e5-v5",
                "input_type": "passage"
            },
            timeout=60.0
        )
        response.raise_for_status()
        data = response.json()["data"]
        embeddings.extend([item["embedding"] for item in data])
        logger.info(f"NVIDIA NIM: Embedded {min(i + batch_size, total)} / {total} documents...")
    return embeddings


def upsert_to_pinecone(docs: list[dict[str, Any]]):
    """Embeds and upserts documents to Pinecone vector database using NVIDIA NIM."""
    logger.info("Generating 1024-dim dense embeddings via NVIDIA NIM (nvidia/nv-embedqa-e5-v5)...")
    texts = [d["text"] for d in docs]
    
    embeddings = _embed_passages_nvidia(texts)

    index = get_pinecone_index()
    vectors = []
    for i, doc in enumerate(docs):
        vectors.append({
            "id": doc["id"],
            "values": embeddings[i],
            "metadata": {
                **doc["metadata"],
                "text": doc["text"],
                "chunk_text": doc["text"],
            }
        })

    # Batch upsert to Pinecone
    batch_size = 50
    total = len(vectors)
    logger.info(f"Upserting {total} vectors to Pinecone index: '{settings.pinecone_index_name}'...")
    for i in range(0, total, batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        logger.info(f"Upserted {min(i + batch_size, total)} / {total} vectors...")

    logger.info("Pinecone Vector Indexing Complete with NVIDIA NIM! 🌲✨")


def main():
    logger.info("=== Starting Sales Intelligence GraphRAG Ingestion Pipeline ===")
    start_time = time.time()

    # 1. Load CSV Datasets
    data = load_datasets()

    # 2. Neo4j AuraDB Knowledge Graph Ingestion
    driver = get_neo4j_driver()
    if driver:
        populate_neo4j_graph(driver, data)
        driver.close()
    else:
        logger.warning("Skipped Neo4j graph population. Set NEO4J_PASSWORD in .env to upload to AuraDB.")

    # 3. Pinecone Vector Ingestion
    docs = generate_semantic_documents(data)
    upsert_to_pinecone(docs)

    elapsed = time.time() - start_time
    logger.info(f"=== Ingestion Finished in {elapsed:.2f}s! ===")


if __name__ == "__main__":
    main()
