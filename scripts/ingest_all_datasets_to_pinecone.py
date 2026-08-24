import os
import sys
import time
import json
import httpx
import pandas as pd
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pinecone import Pinecone, ServerlessSpec
from app.config import settings

DATASET_DIR = PROJECT_ROOT / "dataset"
INDEX_NAME = settings.pinecone_index_name  # enterprise-rag-demo
EMBED_MODEL = settings.nvidia_embedding_model  # nvidia/nv-embedqa-e5-v5
EMBED_DIM = 1024

def get_or_create_pinecone_index(pc: Pinecone):
    """Ensure Pinecone index exists with 1024 dimension and cosine metric."""
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    print(f"🌲 Pinecone Existing Indexes: {existing_indexes}")

    if INDEX_NAME not in existing_indexes:
        print(f"✨ Creating Serverless Pinecone Index '{INDEX_NAME}' (dim={EMBED_DIM}, metric=cosine, cloud={settings.pinecone_cloud}, region={settings.pinecone_region})...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(
                cloud=settings.pinecone_cloud,
                region=settings.pinecone_region
            )
        )
        # Wait for index to become ready
        while not pc.describe_index(INDEX_NAME).status["ready"]:
            print("  ⏳ Waiting for Pinecone index to initialize...")
            time.sleep(2)
        print(f"  ✅ Pinecone Index '{INDEX_NAME}' is READY!")
    else:
        print(f"  ✅ Pinecone Index '{INDEX_NAME}' already exists.")

    return pc.Index(INDEX_NAME)


def embed_batch_nvidia_nim(texts: list[str]) -> list[list[float]]:
    """Embed a batch of text chunks using NVIDIA NIM API."""
    url = "https://integrate.api.nvidia.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.nvidia_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "input": texts if len(texts) > 1 else texts[0],
        "model": EMBED_MODEL,
        "input_type": "passage"
    }
    
    for attempt in range(5):
        try:
            resp = httpx.post(url, headers=headers, json=payload, timeout=45.0)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return [item["embedding"] for item in data]
            elif resp.status_code == 429:
                wait_sec = 2 ** attempt
                print(f"  ⚠️ Rate limit 429 on NVIDIA NIM, backing off for {wait_sec}s...")
                time.sleep(wait_sec)
            else:
                print(f"  ⚠️ NVIDIA NIM error {resp.status_code}: {resp.text[:120]}")
                time.sleep(2)
        except Exception as exc:
            print(f"  ⚠️ Exception in embedding batch: {exc}")
            time.sleep(2)
    
    raise RuntimeError("Failed to get embeddings from NVIDIA NIM after 5 attempts.")


def build_knowledge_chunks() -> list[dict]:
    """Extract and build rich, structured knowledge chunks from all datasets in dataset/."""
    chunks = []
    print("\n📚 Parsing and chunking datasets in dataset/ ...")

    # ── 1. Apple Products Catalog ──────────────────────────────────────────
    p_prod = DATASET_DIR / "apple_products.csv"
    if p_prod.exists():
        df = pd.read_csv(p_prod)
        print(f"  • Chunking {len(df)} Apple Products...")
        for _, row in df.iterrows():
            pid = str(row.get("Product_ID", "") or row.get("product_id", ""))
            pname = str(row.get("Product_Name", "") or row.get("product_name", ""))
            cid = str(row.get("Category_ID", "") or row.get("category_id", ""))
            launch = str(row.get("Launch_Date", "") or row.get("launch_date", ""))
            price = row.get("Price", 0) or row.get("price", 0)
            
            cat_label = "Laptops & Mac" if "CAT-1" in cid else "Audio & AirPods" if "CAT-2" in cid else "Smartphones & Mobile"
            text = (
                f"Product: {pname} (SKU: {pid})\n"
                f"Category: {cat_label} (ID: {cid})\n"
                f"Launch Date: {launch}\n"
                f"Retail Price: ${price} USD\n"
                f"Specifications: Apple official hardware catalog item. MSRP is ${price}.00 USD. "
                f"Released to global retail markets on {launch}."
            )
            chunks.append({
                "id": f"apple_prod_{pid}",
                "text": text,
                "metadata": {
                    "title": pname,
                    "brand": "Apple",
                    "category": cat_label,
                    "doc_id": f"apple_prod_{pid}",
                    "source_type": "product_catalog",
                    "text": text
                }
            })

    # ── 2. Apple Retail Stores Directory ───────────────────────────────────
    p_stores = DATASET_DIR / "apple_stores.csv"
    if p_stores.exists():
        df = pd.read_csv(p_stores)
        print(f"  • Chunking {len(df)} Apple Store Locations...")
        for _, row in df.iterrows():
            sid = str(row.get("Store_ID", "") or row.get("store_id", ""))
            sname = str(row.get("Store_Name", "") or row.get("store_name", ""))
            city = str(row.get("City", "") or row.get("city", ""))
            country = str(row.get("Country", "") or row.get("country", ""))
            
            text = (
                f"Apple Retail Store: {sname} (ID: {sid})\n"
                f"Location: {city}, {country}\n"
                f"Operating Region: Official Apple flagship retail outlet serving {city} and {country}. "
                f"Handles direct-to-consumer sales, Genius Bar support, and warranty service requests."
            )
            chunks.append({
                "id": f"apple_store_{sid}",
                "text": text,
                "metadata": {
                    "title": sname,
                    "brand": "Apple",
                    "category": "Retail Stores",
                    "doc_id": f"apple_store_{sid}",
                    "source_type": "store_directory",
                    "text": text
                }
            })

    # ── 3. Apple Warranty Claims Reliability Summary ───────────────────────
    p_war = DATASET_DIR / "apple_warranty_claims.csv"
    if p_war.exists():
        df = pd.read_csv(p_war)
        print(f"  • Chunking Apple Warranty Claims ({len(df):,} total records)...")
        status_counts = df["repair_status"].value_counts().to_dict()
        text = (
            f"Apple Hardware Reliability & Warranty Claim Analytics:\n"
            f"Total Claims Analyzed: {len(df):,} warranty requests across global retail stores.\n"
            f"Repair Status Breakdown: Completed: {status_counts.get('Completed', 0):,}, "
            f"Pending: {status_counts.get('Pending', 0):,}, "
            f"In Progress: {status_counts.get('In Progress', 0):,}, "
            f"Rejected: {status_counts.get('Rejected', 0):,}.\n"
            f"Top Claimed Product: MacBook Pro (Touch Bar) recorded the highest total claims (381 claims) "
            f"followed by iPhone 13 Pro Max (372 claims)."
        )
        chunks.append({
            "id": "apple_warranty_overview",
            "text": text,
            "metadata": {
                "title": "Apple Warranty & Reliability Intelligence",
                "brand": "Apple",
                "category": "Warranty Analytics",
                "doc_id": "apple_warranty_overview",
                "source_type": "warranty_intelligence",
                "text": text
            }
        })

    # ── 4. Samsung 5G Regional Sales Intelligence ──────────────────────────
    p_sam = DATASET_DIR / "samsung_5g_regional_sales.csv"
    if p_sam.exists():
        df = pd.read_csv(p_sam)
        print(f"  • Chunking Samsung 5G Regional Records ({len(df)} entries)...")
        # Regional summaries
        for region, r_df in df.groupby("Region"):
            total_rev = r_df["Revenue ($)"].sum()
            total_units = r_df["Units Sold"].sum()
            avg_share = r_df["Market Share (%)"].mean()
            top_models = r_df.groupby("Product Model")["Revenue ($)"].sum().sort_values(ascending=False).head(4)
            top_models_str = ", ".join([f"{m} (${rev:,.2f} USD)" for m, rev in top_models.items()])

            text = (
                f"Samsung 5G Regional Market Intelligence — Region: {region}\n"
                f"Total Regional 5G Revenue: ${total_rev:,.2f} USD\n"
                f"Total 5G Units Sold: {total_units:,} units\n"
                f"Average Regional 5G Market Share: {avg_share:.2f}%\n"
                f"Top Performing Models by Revenue: {top_models_str}.\n"
                f"Analysis: Samsung maintains dominant regional 5G presence in {region}, driving high quarterly volume "
                f"across Galaxy S-series, A-series, and foldable Z-series lines."
            )
            chunks.append({
                "id": f"samsung_5g_{region.lower().replace(' ', '_').replace('&', 'and')}",
                "text": text,
                "metadata": {
                    "title": f"Samsung 5G Intelligence ({region})",
                    "brand": "Samsung",
                    "category": "5G Market Share",
                    "doc_id": f"samsung_5g_{region.lower().replace(' ', '_').replace('&', 'and')}",
                    "source_type": "regional_sales",
                    "text": text
                }
            })

    # ── 5. Global Brand Comparison (Samsung vs Apple) ──────────────────────
    text_comp = (
        f"Global Smartphone & Retail Sales Intelligence: Samsung vs. Apple Comparison\n"
        f"Total Global Shipment Volume: Samsung recorded 11,750,000 units sold across international regions, "
        f"compared to Apple's 5,720,000 total hardware unit sales.\n"
        f"Total Revenue Generated: Samsung generated $10.77 Billion USD in quarterly revenue, "
        f"compared to Apple's $6.17 Billion USD in retail sales.\n"
        f"Market Dynamics: Samsung leads in overall unit volume and 5G mid-tier penetration (Latin America, Asia-Pacific), "
        f"while Apple commands higher Average Selling Price (ASP) and premium retail store concentration in North America & Europe."
    )
    chunks.append({
        "id": "global_brand_comparison_samsung_apple",
        "text": text_comp,
        "metadata": {
            "title": "Samsung vs Apple Global Sales Intelligence",
            "brand": "Comparative",
            "category": "Global Analytics",
            "doc_id": "global_brand_comparison_samsung_apple",
            "source_type": "market_comparison",
            "text": text_comp
        }
    })

    # ── 6. Dilip Bhakadiwal AI Portfolio & MoES Research ───────────────────
    portfolio_docs = [
        {
            "id": "portfolio_research_focal_cbam",
            "title": "Dilip Bhakadiwal — MoES IEEE Research on Focal-CBAM Fish-YOLO",
            "category": "Research & Publications",
            "text": (
                "Author: Dilip Bhakadiwal (M.Tech in Artificial Intelligence, DIAT DRDO, Pune).\n"
                "Published Paper: Focal-CBAM Fish-YOLO: Attention-Enhanced Deep Learning for Underwater Object Detection.\n"
                "Funding & Sponsorship: Funded by the Ministry of Earth Sciences (MoES), Government of India.\n"
                "Publication Venue: IEEE Xplore.\n"
                "Technical Innovation: Developed a novel Focal-CBAM dual-attention module integrated into YOLOv8 architecture, "
                "improving feature representation in turbid underwater imagery with high mAP50 and low computational latency."
            )
        },
        {
            "id": "portfolio_marketpulse_ai",
            "title": "Dilip Bhakadiwal — MarketPulse AI Architecture",
            "category": "Enterprise Systems",
            "text": (
                "Project: MarketPulse AI — Multi-Agent Financial Intelligence Platform.\n"
                "Architect: Dilip Bhakadiwal.\n"
                "Core Stack: LangGraph, FastAPI, Redis, Pinecone, Neo4j, Groq LPU, AWS ECS.\n"
                "Architecture Details: Implemented an autonomous multi-agent graph with dynamic intent routing, "
                "multi-hop query decomposition, sub-millisecond semantic caching, and strict PII guardrails."
            )
        },
        {
            "id": "portfolio_redwood_inference",
            "title": "Dilip Bhakadiwal — Redwood Scalable Backend Microservices",
            "category": "Cloud Infrastructure",
            "text": (
                "Project: Redwood Inference Pipeline & Distributed Backend.\n"
                "Engineer: Dilip Bhakadiwal.\n"
                "Specialization: High-throughput async ASGI microservices, Docker containerization, WebSocket streaming, "
                "resilient 3-tier LLM failover ladders (Groq -> OpenRouter -> NVIDIA NIM), and sub-200ms latency SLAs."
            )
        }
    ]

    for p in portfolio_docs:
        chunks.append({
            "id": p["id"],
            "text": p["text"],
            "metadata": {
                "title": p["title"],
                "brand": "Portfolio",
                "category": p["category"],
                "doc_id": p["id"],
                "source_type": "portfolio_document",
                "text": p["text"]
            }
        })

    print(f"✨ Total Structured Knowledge Chunks Created: {len(chunks)}")
    return chunks


def ingest_to_pinecone():
    print("=" * 80)
    print("🚀 HIGH-PERFORMANCE PINECONE VECTOR INGESTION PIPELINE")
    print(f"   Target Index: {INDEX_NAME} | Provider: NVIDIA NIM ({EMBED_MODEL})")
    print("=" * 80)

    # 1. Initialize Pinecone & Index
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = get_or_create_pinecone_index(pc)

    # 2. Build Chunks
    chunks = build_knowledge_chunks()

    # 3. Batch Embed and Upsert
    batch_size = 25
    total_chunks = len(chunks)
    print(f"\n⚡ Ingesting {total_chunks} chunks in batches of {batch_size}...")

    t0 = time.perf_counter()
    upserted_count = 0

    for i in range(0, total_chunks, batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c["text"] for c in batch]
        
        print(f"  • Embedding batch {i // batch_size + 1}/{(total_chunks + batch_size - 1) // batch_size} ({len(batch)} chunks)...")
        embeddings = embed_batch_nvidia_nim(texts)

        # Prepare Pinecone vectors
        vectors_to_upsert = []
        for c, emb in zip(batch, embeddings):
            vectors_to_upsert.append({
                "id": c["id"],
                "values": emb,
                "metadata": c["metadata"]
            })

        index.upsert(vectors=vectors_to_upsert)
        upserted_count += len(vectors_to_upsert)
        print(f"    ✅ Upserted {upserted_count}/{total_chunks} vectors into '{INDEX_NAME}'")
        time.sleep(0.5)  # respectful pacing for rate limits

    elapsed = time.perf_counter() - t0
    print(f"\n🎉 Pinecone Ingestion Complete in {elapsed:.2f} seconds!")

    # Verify Index Stats
    time.sleep(2)
    stats = index.describe_index_stats()
    print(f"📊 Final Pinecone Index Stats: {stats}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    ingest_to_pinecone()
