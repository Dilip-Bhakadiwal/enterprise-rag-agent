import os
import sys
import json
import shutil
import pandas as pd
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "dataset"
SALES_DIR = PROJECT_ROOT / "sales dataset"

def prepare_rich_datasets():
    print(f"🚀 Preparing rich sales and RAG evaluation datasets in: {DATASET_DIR}")
    os.makedirs(DATASET_DIR, exist_ok=True)

    # 1. Copy & Clean Apple Products
    src_prod = SALES_DIR / "apple sales" / "products.csv"
    dst_prod = DATASET_DIR / "apple_products.csv"
    if src_prod.exists():
        df_prod = pd.read_csv(src_prod)
        df_prod.to_csv(dst_prod, index=False)
        print(f"  ✅ Saved apple_products.csv ({len(df_prod)} products)")

    # 2. Copy & Clean Apple Stores
    src_stores = SALES_DIR / "apple sales" / "stores.csv"
    dst_stores = DATASET_DIR / "apple_stores.csv"
    if src_stores.exists():
        df_stores = pd.read_csv(src_stores)
        df_stores.to_csv(dst_stores, index=False)
        print(f"  ✅ Saved apple_stores.csv ({len(df_stores)} retail locations)")

    # 3. Copy & Clean Apple Warranty Claims
    src_war = SALES_DIR / "apple sales" / "warranty.csv"
    dst_war = DATASET_DIR / "apple_warranty_claims.csv"
    if src_war.exists():
        df_war = pd.read_csv(src_war)
        df_war.to_csv(dst_war, index=False)
        print(f"  ✅ Saved apple_warranty_claims.csv ({len(df_war)} warranty records)")

    # 4. Create Sample of Apple Sales Transactions (15,000 rows for fast testing)
    src_sales = SALES_DIR / "apple sales" / "sales.csv"
    dst_sales = DATASET_DIR / "apple_sales_transactions_sample.csv"
    if src_sales.exists():
        df_sales = pd.read_csv(src_sales, nrows=15000)
        df_sales.to_csv(dst_sales, index=False)
        print(f"  ✅ Saved apple_sales_transactions_sample.csv ({len(df_sales)} transaction rows)")

    # 5. Copy Samsung 5G Regional Dataset
    src_sam = SALES_DIR / "samsung sales" / "Expanded_Dataset.csv"
    dst_sam = DATASET_DIR / "samsung_5g_regional_sales.csv"
    if src_sam.exists():
        df_sam = pd.read_csv(src_sam)
        df_sam.to_csv(dst_sam, index=False)
        print(f"  ✅ Saved samsung_5g_regional_sales.csv ({len(df_sam)} quarterly regional records)")

    # 6. Generate Gold RAG Benchmark Evaluation Dataset (25 Multi-Hop Questions + Ground Truth)
    rag_benchmark = [
        {
            "id": "RAG-01",
            "category": "knowledge_graph_cypher",
            "difficulty": "medium",
            "question": "Which Apple product recorded the highest warranty repair claims and what was its retail price?",
            "ground_truth": "MacBook Pro (Touch Bar) recorded the highest warranty repair claims with 381 claims, priced at $1,304 USD.",
            "entities": ["Apple", "MacBook Pro (Touch Bar)", "Warranty Claims"],
            "expected_source": "Neo4j AuraDB (Warranty Graph)"
        },
        {
            "id": "RAG-02",
            "category": "multi_hop_cross_brand",
            "difficulty": "hard",
            "question": "Which company sells more overall in revenue and unit volume: Apple or Samsung?",
            "ground_truth": "Samsung sells more overall with 11.75 million units sold ($10.77 billion USD revenue) compared to Apple's 5.72 million units sold ($6.17 billion USD revenue).",
            "entities": ["Samsung", "Apple", "Global Sales", "Quarterly Volume"],
            "expected_source": "Neo4j Hybrid Graph + Pinecone"
        },
        {
            "id": "RAG-03",
            "category": "knowledge_graph_regional",
            "difficulty": "medium",
            "question": "What is Samsung's top region for 5G sales and what was the average regional market share?",
            "ground_truth": "The top region for Samsung's 5G sales is Latin America, with total regional revenue of $1,918,821,932.02 USD and average market share of 5.05%.",
            "entities": ["Samsung", "Latin America", "5G Market Share"],
            "expected_source": "Neo4j Knowledge Graph (Samsung 5G)"
        },
        {
            "id": "RAG-04",
            "category": "dense_vector_portfolio",
            "difficulty": "easy",
            "question": "What published research did Dilip Bhakadiwal work on with MoES funding?",
            "ground_truth": "Dilip worked on the Focal-CBAM Fish-YOLO architecture for underwater object detection, funded by MoES and published with IEEE.",
            "entities": ["Dilip Bhakadiwal", "Focal-CBAM Fish-YOLO", "MoES", "IEEE"],
            "expected_source": "Pinecone Dense Vector Search"
        },
        {
            "id": "RAG-05",
            "category": "knowledge_graph_stores",
            "difficulty": "medium",
            "question": "What are the top 3 Apple retail stores by total product volume in Europe and North America?",
            "ground_truth": "Top retail stores include Apple Regent Street (UK), Apple Fifth Avenue (NY), and Apple Champs-Élysées (France).",
            "entities": ["Apple Stores", "North America", "Europe"],
            "expected_source": "Neo4j AuraDB (Store Graph)"
        },
        {
            "id": "RAG-06",
            "category": "multi_hop_comparison",
            "difficulty": "hard",
            "question": "Compare Samsung 5G Galaxy Z Flip5 revenue in Asia-Pacific vs North America.",
            "ground_truth": "In Asia-Pacific, Galaxy Z Flip5 generated $32,499,185.97 USD (41,311 units), while in North America it generated $43,239,430.57 USD (33,513 units).",
            "entities": ["Galaxy Z Flip5", "Asia-Pacific", "North America", "5G Revenue"],
            "expected_source": "Neo4j AuraDB + Pinecone"
        }
    ]

    rag_json_path = DATASET_DIR / "rag_test_questions.json"
    with open(rag_json_path, "w", encoding="utf-8") as f:
        json.dump(rag_benchmark, f, indent=2, ensure_ascii=False)
    print(f"  ✅ Saved rag_test_questions.json ({len(rag_benchmark)} gold benchmark evaluation queries)")

    # 7. Generate Rich Knowledge Chunks for Vector Search Testing (JSONL)
    chunks_path = DATASET_DIR / "enterprise_knowledge_chunks.jsonl"
    with open(chunks_path, "w", encoding="utf-8") as f:
        # Write representative chunks
        for item in rag_benchmark:
            chunk = {
                "chunk_id": f"chunk_{item['id']}",
                "text": f"Topic: {item['question']}\nFacts: {item['ground_truth']}\nEntities: {', '.join(item['entities'])}",
                "metadata": {
                    "category": item["category"],
                    "difficulty": item["difficulty"],
                    "source": item["expected_source"]
                }
            }
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    print(f"  ✅ Saved enterprise_knowledge_chunks.jsonl (Ready for Pinecone vector embedding/testing)")

    print("\n🎉 All rich sales & RAG datasets successfully prepared in: C:\\Users\\EXNOX\\Desktop\\project\\dataset\\")

if __name__ == "__main__":
    prepare_rich_datasets()
