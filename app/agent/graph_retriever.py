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
            )
            _neo4j_driver.verify_connectivity()
            logger.info("Neo4j AuraDB Graph Driver connected successfully.")
        except Exception as exc:
            logger.warning(f"Neo4j driver initialization fallback: {exc}")
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

def get_top_warranty_claims_graph_context() -> list[dict[str, Any]]:
    """Fetch top products ranked by total warranty claims."""
    cypher = """
    MATCH (p:Product)
    WHERE p.total_warranty_claims IS NOT NULL AND p.total_warranty_claims > 0
    OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
    RETURN p.name AS product, p.brand AS brand, c.name AS category, p.price AS price, p.total_warranty_claims AS claims
    ORDER BY claims DESC
    LIMIT 6
    """
    return query_neo4j_graph(cypher)


def get_top_stores_graph_context() -> list[dict[str, Any]]:
    """Fetch top retail store locations ranked by aggregated sales volume and revenue."""
    cypher = """
    MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)
    OPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)
    RETURN s.name AS store, c.name AS city, co.name AS country,
           sum(r.total_units) AS total_units,
           sum(r.revenue) AS total_revenue
    ORDER BY total_units DESC
    LIMIT 6
    """
    return query_neo4j_graph(cypher)


def get_top_selling_products_graph_context() -> list[dict[str, Any]]:
    """Fetch top selling products across all global stores."""
    cypher = """
    MATCH (s:Store)-[r:SOLD_PRODUCT]->(p:Product)
    OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
    RETURN p.name AS product, c.name AS category, p.price AS price,
           sum(r.total_units) AS total_units,
           sum(r.revenue) AS total_revenue
    ORDER BY total_units DESC
    LIMIT 6
    """
    return query_neo4j_graph(cypher)


def get_product_graph_context(product_name: str) -> list[dict[str, Any]]:
    """Traverse graph for a product: Category, price, launch date, warranty claims, stores sold."""
    cypher = """
    MATCH (p:Product)
    WHERE toLower(p.name) CONTAINS toLower($name)
    OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
    OPTIONAL MATCH (s:Store)-[r:SOLD_PRODUCT]->(p)
    OPTIONAL MATCH (p)-[perf:PERFORMED_IN]->(reg:Region)
    RETURN p.name AS product,
           p.brand AS brand,
           p.price AS price,
           p.launch_date AS launch_date,
           p.total_warranty_claims AS warranty_claims,
           c.name AS category,
           count(DISTINCT s) AS store_count,
           sum(r.total_units) AS total_units_sold,
           avg(perf.market_share) AS avg_samsung_market_share,
           avg(perf.avg_5g_speed) AS avg_5g_speed
    LIMIT 5
    """
    return query_neo4j_graph(cypher, {"name": product_name})


def get_regional_sales_graph_context(region_or_country: str) -> list[dict[str, Any]]:
    """Traverse regional performance and store locations with geographic alias expansion."""
    loc_lower = region_or_country.lower()
    
    if any(k in loc_lower for k in ["north america", "usa", "us", "america", "united states", "canada"]):
        cypher = """
        MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)
        WHERE co.name IN ['United States', 'Canada']
        OPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)
        RETURN s.name AS store, c.name AS city, co.name AS country,
               count(DISTINCT p) AS products_stocked,
               sum(r.total_units) AS total_store_units,
               sum(r.revenue) AS total_store_revenue
        ORDER BY total_store_units DESC
        LIMIT 6
        """
        return query_neo4j_graph(cypher)
        
    if any(k in loc_lower for k in ["europe", "eu", "uk", "france", "germany", "italy", "spain", "london", "paris"]):
        cypher = """
        MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)
        WHERE co.name IN ['United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Switzerland', 'Austria']
           OR c.name IN ['London', 'Paris', 'Berlin', 'Munich', 'Rome', 'Madrid', 'Amsterdam', 'Zurich']
        OPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)
        RETURN s.name AS store, c.name AS city, co.name AS country,
               count(DISTINCT p) AS products_stocked,
               sum(r.total_units) AS total_store_units,
               sum(r.revenue) AS total_store_revenue
        ORDER BY total_store_units DESC
        LIMIT 6
        """
        return query_neo4j_graph(cypher)

    cypher = """
    MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)
    WHERE toLower(co.name) CONTAINS toLower($loc) OR toLower(c.name) CONTAINS toLower($loc)
    OPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)
    RETURN s.name AS store, c.name AS city, co.name AS country,
           count(DISTINCT p) AS products_stocked,
           sum(r.total_units) AS total_store_units,
           sum(r.revenue) AS total_store_revenue
    ORDER BY total_store_units DESC
    LIMIT 6
    """
    return query_neo4j_graph(cypher, {"loc": region_or_country})


def get_samsung_model_graph_context(model_name: str, region: str | None = None) -> list[dict[str, Any]]:
    """Traverse Samsung model performance across regions or a specific region."""
    if region:
        cypher = """
        MATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(reg:Region)
        WHERE toLower(p.name) CONTAINS toLower($model) AND toLower(reg.name) CONTAINS toLower($region)
        RETURN p.name AS model, reg.name AS region,
               avg(perf.market_share) AS avg_share,
               sum(perf.revenue) AS total_revenue,
               avg(perf.revenue) AS avg_quarterly_revenue,
               sum(perf.units_sold) AS total_units,
               count(perf) AS quarters
        LIMIT 5
        """
        return query_neo4j_graph(cypher, {"model": model_name, "region": region})
    else:
        cypher = """
        MATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(reg:Region)
        WHERE toLower(p.name) CONTAINS toLower($model)
        RETURN p.name AS model, reg.name AS region,
               avg(perf.market_share) AS avg_share,
               sum(perf.revenue) AS total_revenue,
               avg(perf.revenue) AS avg_quarterly_revenue,
               sum(perf.units_sold) AS total_units,
               count(perf) AS quarters
        ORDER BY total_revenue DESC
        LIMIT 5
        """
        return query_neo4j_graph(cypher, {"model": model_name})


def get_samsung_5g_comparison() -> list[dict[str, Any]]:
    """Fetch 5G vs 4G aggregated market share and revenue comparison."""
    cypher = """
    MATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(r:Region)
    RETURN p.five_g_capable AS is_5g,
           r.name AS region,
           avg(perf.market_share) AS avg_market_share,
           sum(perf.units_sold) AS total_units,
           sum(perf.revenue) AS total_revenue,
           avg(perf.avg_5g_speed) AS avg_speed
    ORDER BY total_revenue DESC
    LIMIT 10
    """
    return query_neo4j_graph(cypher)


def get_brand_comparison_graph_context() -> list[dict[str, Any]]:
    """Fetch high-level comparison between Apple total retail sales and Samsung mobile sales."""
    cypher_apple = """
    MATCH (s:Store)-[r:SOLD_PRODUCT]->(p:Product)
    RETURN 'Apple' AS brand, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue, count(DISTINCT s) AS total_stores, count(DISTINCT p) AS total_products
    """
    cypher_samsung = """
    MATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(r:Region)
    RETURN 'Samsung' AS brand, sum(perf.units_sold) AS total_units, sum(perf.revenue) AS total_revenue, count(DISTINCT p) AS total_models, count(DISTINCT r) AS total_regions
    """
    apple_data = query_neo4j_graph(cypher_apple)
    samsung_data = query_neo4j_graph(cypher_samsung)
    results = []
    if apple_data:
        results.append(apple_data[0])
    if samsung_data:
        results.append(samsung_data[0])
    return results


# ── Hybrid Graph + Vector Search Orchestrator ──────────────────────────────

def retrieve_hybrid_graph_chunks(query: str, top_k: int = 5) -> tuple[list[dict[str, Any]], bool]:
    """
    Orchestrates Hybrid GraphRAG retrieval:
      1. Dense vector search in Pinecone.
      2. Intent & Entity recognition for Knowledge Graph traversal.
      3. Graph traversal in Neo4j AuraDB.
      4. Merging and ranking into unified context items.
    """
    # 1. Pinecone Dense Vector Retrieval
    vector_chunks, used_fallback = retrieve_pinecone_chunks(query=query, source_filter=[])

    # 2. Extract potential entities / intents for Graph Traversal
    graph_facts: list[dict[str, Any]] = []
    clean_q = query.lower().replace("'", "").replace('"', "")

    # ── Universal Knowledge Graph Entity Resolver (City & Location Deep-Dive) ──
    city_nodes = query_neo4j_graph(
        f"MATCH (c:City) WHERE '{clean_q}' CONTAINS toLower(c.name) RETURN c.name AS city LIMIT 3"
    )
    if city_nodes:
        for c_entry in city_nodes:
            c_name = c_entry.get("city")
            if not c_name:
                continue
            stores_in_city = query_neo4j_graph(f"""
                MATCH (c:City)<-[:LOCATED_IN]-(s:Store)-[r:SOLD_PRODUCT]->(p:Product)
                WHERE c.name = '{c_name}'
                OPTIONAL MATCH (c)-[:IN_COUNTRY]->(co:Country)
                RETURN c.name AS city, co.name AS country, s.name AS store,
                       sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue,
                       count(DISTINCT p) AS products_count
                ORDER BY total_revenue DESC
            """)
            top_prods_city = query_neo4j_graph(f"""
                MATCH (c:City)<-[:LOCATED_IN]-(s:Store)-[r:SOLD_PRODUCT]->(p:Product)
                WHERE c.name = '{c_name}'
                RETURN s.name AS store, p.name AS product, p.price AS price, sum(r.total_units) AS units, sum(r.revenue) AS revenue
                ORDER BY revenue DESC LIMIT 5
            """)
            
            if stores_in_city:
                country_name = stores_in_city[0].get("country", "United States")
                tot_city_units = sum(s.get("total_units", 0) for s in stores_in_city)
                tot_city_rev = sum(s.get("total_revenue", 0.0) for s in stores_in_city)
                
                stores_bullet = "\n".join(
                    f"  - **{s.get('store')}**: {s.get('total_units', 0):,} units sold | ${s.get('total_revenue', 0):,.2f} USD Revenue ({s.get('products_count', 0)} product SKUs)"
                    for s in stores_in_city
                )
                top_prods_bullet = "\n".join(
                    f"  {idx}. **{tp.get('product')}** (${tp.get('price', 0):,.2f} MSRP) — {tp.get('units', 0):,} units (${tp.get('revenue', 0):,.2f} USD revenue) at {tp.get('store')}"
                    for idx, tp in enumerate(top_prods_city, 1)
                ) if top_prods_city else "  - Data aggregated across all store SKUs."

                graph_facts.append({
                    "doc_id": f"neo4j_city_{c_name.lower().replace(' ', '_')}",
                    "chunk_text": (
                        f"### Neo4j Knowledge Graph Fact: City Market Intelligence — {c_name} ({country_name})\n"
                        f"- **City**: {c_name}\n"
                        f"- **Country**: {country_name}\n"
                        f"- **Flagship Retail Stores in {c_name} ({len(stores_in_city)})**:\n{stores_bullet}\n"
                        f"- **Total Aggregated City Revenue**: ${tot_city_rev:,.2f} USD\n"
                        f"- **Total Units Sold across {c_name} Stores**: {tot_city_units:,} units\n"
                        f"- **Top Revenue-Generating Products in {c_name}**:\n{top_prods_bullet}"
                    ),
                    "source_type": "neo4j_graph",
                    "category": "City Intelligence",
                    "authority": 10,
                    "score": 0.99,
                    "is_graph": True,
                    "cypher_preview": f"MATCH (c:City {{name: '{c_name}'}})<-[:LOCATED_IN]-(s:Store)-[r:SOLD_PRODUCT]->(p:Product)\nOPTIONAL MATCH (c)-[:IN_COUNTRY]->(co:Country)\nRETURN c.name AS city, co.name AS country, s.name AS store, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue, count(DISTINCT p) AS products_count\nORDER BY total_revenue DESC;",
                })

    # ── Universal Knowledge Graph Store Deep-Dive ──
    store_nodes = query_neo4j_graph(
        f"MATCH (s:Store) WHERE '{clean_q}' CONTAINS toLower(s.name) RETURN s.name AS store LIMIT 2"
    )
    if store_nodes:
        for s_entry in store_nodes:
            s_name = s_entry.get("store")
            if not s_name:
                continue
            store_details = query_neo4j_graph(f"""
                MATCH (s:Store {{name: '{s_name}'}})-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)
                OPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)
                RETURN s.name AS store, c.name AS city, co.name AS country,
                       sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue, count(DISTINCT p) AS products_count
            """)
            top_prods_store = query_neo4j_graph(f"""
                MATCH (s:Store {{name: '{s_name}'}})-[r:SOLD_PRODUCT]->(p:Product)
                RETURN p.name AS product, p.price AS price, r.total_units AS units, r.revenue AS revenue
                ORDER BY revenue DESC LIMIT 5
            """)
            if store_details:
                sd = store_details[0]
                prods_bullet = "\n".join(
                    f"  {idx}. **{tp.get('product')}** (${tp.get('price', 0):,.2f}) — {tp.get('units', 0):,} units (${tp.get('revenue', 0):,.2f} USD)"
                    for idx, tp in enumerate(top_prods_store, 1)
                ) if top_prods_store else "  - All products stocked."
                graph_facts.append({
                    "doc_id": f"neo4j_store_detail_{s_name.lower().replace(' ', '_')}",
                    "chunk_text": (
                        f"### Neo4j Knowledge Graph Fact: Retail Store Deep-Dive — {s_name}\n"
                        f"- **Store Location**: {sd.get('city')}, {sd.get('country')}\n"
                        f"- **Total Aggregated Revenue**: ${sd.get('total_revenue', 0):,.2f} USD\n"
                        f"- **Total Units Sold**: {sd.get('total_units', 0):,} units\n"
                        f"- **Distinct Product SKUs**: {sd.get('products_count', 0)} products\n"
                        f"- **Top Selling Products**:\n{prods_bullet}"
                    ),
                    "source_type": "neo4j_graph",
                    "category": "Store Analytics",
                    "authority": 10,
                    "score": 0.99,
                    "is_graph": True,
                    "cypher_preview": f"MATCH (s:Store {{name: '{s_name}'}})-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)\nOPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)\nRETURN s.name, c.name, co.name, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue;",
                })

    # ── Universal Knowledge Graph Category Resolver ──
    cat_nodes = query_neo4j_graph(
        f"MATCH (cat:Category) WHERE '{clean_q}' CONTAINS toLower(cat.name) RETURN cat.name AS category LIMIT 2"
    )
    if cat_nodes:
        for cat_entry in cat_nodes:
            cat_name = cat_entry.get("category")
            if not cat_name:
                continue
            cat_details = query_neo4j_graph(f"""
                MATCH (cat:Category {{name: '{cat_name}'}})<-[:BELONGS_TO]-(p:Product)
                OPTIONAL MATCH (s:Store)-[r:SOLD_PRODUCT]->(p)
                RETURN cat.name AS category, count(DISTINCT p) AS product_count,
                       avg(p.price) AS avg_price, sum(p.total_warranty_claims) AS total_warranty_claims,
                       sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue
            """)
            if cat_details:
                cd = cat_details[0]
                graph_facts.append({
                    "doc_id": f"neo4j_cat_{cat_name.lower().replace(' ', '_')}",
                    "chunk_text": (
                        f"### Neo4j Knowledge Graph Fact: Category Intelligence — {cat_name}\n"
                        f"- **Category**: {cat_name}\n"
                        f"- **Products in Category**: {cd.get('product_count', 0)} product models\n"
                        f"- **Average MSRP**: ${cd.get('avg_price', 0):,.2f} USD\n"
                        f"- **Recorded Warranty Claims**: {cd.get('total_warranty_claims', 0):,} claims\n"
                        f"- **Total Aggregated Revenue**: ${cd.get('total_revenue', 0):,.2f} USD"
                    ),
                    "source_type": "neo4j_graph",
                    "category": "Category Analytics",
                    "authority": 10,
                    "score": 0.99,
                    "is_graph": True,
                    "cypher_preview": f"MATCH (cat:Category {{name: '{cat_name}'}})<-[:BELONGS_TO]-(p:Product)\nOPTIONAL MATCH (s:Store)-[r:SOLD_PRODUCT]->(p)\nRETURN cat.name, count(DISTINCT p) AS product_count, avg(p.price) AS avg_price, sum(r.revenue) AS total_revenue;",
                })
    
    # Check for Brand comparison queries (Apple vs Samsung)
    if re.search(r"\b(apple.*samsung|samsung.*apple|which company.*sell.*more|who sell.*more|more sell|which company do more sell)\b", query, re.IGNORECASE):
        brand_facts = get_brand_comparison_graph_context()
        for b in brand_facts:
            brand_name = b.get("brand", "Brand")
            graph_facts.append({
                "doc_id": f"neo4j_brand_summary_{brand_name.lower()}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: {brand_name} Global Sales Overview\n"
                    f"- **Company**: {brand_name}\n"
                    f"- **Total Units Sold**: {b.get('total_units', 0):,} units\n"
                    f"- **Total Aggregated Revenue**: ${b.get('total_revenue', 0):,.2f} USD\n"
                    f"- **Coverage**: {b.get('total_stores', b.get('total_regions', 0))} {('Global Stores' if brand_name == 'Apple' else 'Global Regions')}\n"
                    f"- **Portfolio Size**: {b.get('total_products', b.get('total_models', 0))} {('Products' if brand_name == 'Apple' else 'Mobile Models')}"
                ),
                "source_type": "neo4j_graph",
                "category": "Brand Analytics",
                "authority": 10,
                "score": 0.99,
                "is_graph": True,
                "cypher_preview": "MATCH (s:Store)-[r:SOLD_PRODUCT]->(p:Product)\nRETURN 'Apple' AS brand, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue;\n\nMATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(r:Region)\nRETURN 'Samsung' AS brand, sum(perf.units_sold) AS total_units, sum(perf.revenue) AS total_revenue;",
            })
    
    # Check for Samsung keywords / models
    samsung_match = re.search(r"\b(galaxy|s23|s22|s21|s20|s10|note20|note10|z fold|z flip|a14|a32|a52|a73|5g|samsung)\b", query, re.IGNORECASE)
    if samsung_match:
        model_term = samsung_match.group(1)
        reg_match = re.search(r"\b(north america|europe|asia-pacific|asia|latin america|middle east|africa)\b", query, re.IGNORECASE)
        reg_term = reg_match.group(1) if reg_match else None
        
        sam_model_facts = get_samsung_model_graph_context(model_term, reg_term)
        for idx, sf in enumerate(sam_model_facts, 1):
            graph_facts.append({
                "doc_id": f"neo4j_samsung_{idx}_{sf.get('model', 'model').replace(' ', '_')}_{sf.get('region', 'reg').replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph: Samsung {sf.get('model')} Performance in {sf.get('region')}\n"
                    f"- **Model**: {sf.get('model')}\n"
                    f"- **Region**: {sf.get('region')}\n"
                    f"- **Average Regional Market Share**: {sf.get('avg_share', 0):.2f}%\n"
                    f"- **Average Quarterly Revenue**: ${sf.get('avg_quarterly_revenue', 0):,.2f} USD\n"
                    f"- **Total Aggregated Revenue**: ${sf.get('total_revenue', 0):,.2f} USD\n"
                    f"- **Total Units Sold**: {sf.get('total_units', 0):,} units\n"
                    f"- **Quarterly Reports Recorded**: {sf.get('quarters', 0)} quarters"
                ),
                "source_type": "neo4j_graph",
                "category": "Market Intelligence",
                "authority": 10,
                "score": 0.99,
                "is_graph": True,
                "cypher_preview": f"MATCH (p:Product)-[perf:PERFORMED_IN]->(r:Region)\nWHERE toLower(p.name) CONTAINS toLower('{model_term}')\nRETURN p.name AS model, r.name AS region, avg(perf.market_share) AS avg_share, sum(perf.revenue) AS total_revenue\nORDER BY total_revenue DESC LIMIT 5;",
            })
            
        if not sam_model_facts:
            sam_facts = get_samsung_5g_comparison()
            if sam_facts:
                top_sam = sam_facts[0]
                graph_facts.append({
                    "doc_id": "graph_samsung_5g_summary",
                    "chunk_text": (
                        f"### Neo4j Knowledge Graph: Samsung Regional Intelligence\n"
                        f"- **Top Region**: {top_sam.get('region')}\n"
                        f"- **5G Capability**: {'5G Enabled' if top_sam.get('is_5g') else '4G Standard'}\n"
                        f"- **Average Regional Market Share**: {top_sam.get('avg_market_share', 0):.2f}%\n"
                        f"- **Total Regional Revenue**: ${top_sam.get('total_revenue', 0):,.2f} USD\n"
                        f"- **Average 5G Network Speed**: {top_sam.get('avg_speed', 0):.1f} Mbps"
                    ),
                    "source_type": "neo4j_graph",
                    "category": "Graph Analytics",
                    "authority": 10,
                    "score": 0.99,
                    "is_graph": True,
                    "cypher_preview": "MATCH (p:Product {brand: 'Samsung'})-[perf:PERFORMED_IN]->(reg:Region)\nRETURN reg.name AS region, avg(perf.market_share) AS avg_market_share, sum(perf.revenue) AS total_revenue, avg(perf.avg_5g_speed) AS avg_speed\nORDER BY total_revenue DESC LIMIT 5;",
                })

    # Check for Regional / Store queries (if not already purely Samsung model query)
    if not samsung_match and re.search(r"\b(north america|usa|us|america|europe|eu|uk|france|germany|asia|store|stores|retail|location|flagship)\b", query, re.IGNORECASE):
        reg_match = re.search(r"\b(north america|usa|us|america|europe|eu|uk|france|germany|asia|japan|china)\b", query, re.IGNORECASE)
        loc_str = reg_match.group(1) if reg_match else "global"
        store_facts = get_regional_sales_graph_context(loc_str) if reg_match else get_top_stores_graph_context()
        for idx, s in enumerate(store_facts, 1):
            graph_facts.append({
                "doc_id": f"neo4j_store_{idx}_{s.get('store', 'store').replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: Retail Store Performance - {s.get('store')}\n"
                    f"- **Store**: {s.get('store')}\n"
                    f"- **Location**: {s.get('city')}, {s.get('country')}\n"
                    f"- **Total Units Sold**: {s.get('total_store_units', s.get('total_units', 0)):,} units\n"
                    f"- **Total Aggregated Revenue**: ${s.get('total_store_revenue', s.get('revenue', 0)):,.2f} USD"
                ),
                "source_type": "neo4j_graph",
                "category": "Store Analytics",
                "authority": 10,
                "score": 0.99,
                "is_graph": True,
                "cypher_preview": "MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)\nOPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)\nRETURN s.name AS store, c.name AS city, co.name AS country, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue\nORDER BY total_units DESC LIMIT 6;",
            })
    
    # Check for Warranty claims queries
    if re.search(r"\b(warranty|repair|claims|defect|broken)\b", query, re.IGNORECASE):
        w_facts = get_top_warranty_claims_graph_context()
        for idx, item in enumerate(w_facts, 1):
            graph_facts.append({
                "doc_id": f"neo4j_warranty_{idx}_{item.get('product', 'prod').replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: Warranty Claims for {item.get('product')}\n"
                    f"- **Product**: {item.get('product')}\n"
                    f"- **Category**: {item.get('category', 'Hardware')}\n"
                    f"- **Price**: ${item.get('price', 0):,.2f} USD\n"
                    f"- **Total Recorded Warranty Claims**: {item.get('claims', 0):,} claims"
                ),
                "source_type": "neo4j_graph",
                "category": "Warranty Analytics",
                "authority": 10,
                "score": 0.99,
                "is_graph": True,
                "cypher_preview": "MATCH (p:Product)\nWHERE p.total_warranty_claims > 0\nOPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)\nRETURN p.name AS product, c.name AS category, p.price AS price, p.total_warranty_claims AS claims\nORDER BY claims DESC LIMIT 6;",
            })

    # Check for Top Retail Stores queries
    if re.search(r"\b(store|retail|location|flagship|cities|stores)\b", query, re.IGNORECASE):
        store_facts = get_top_stores_graph_context()
        for idx, s in enumerate(store_facts, 1):
            graph_facts.append({
                "doc_id": f"neo4j_store_{idx}_{s.get('store', 'store').replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: Retail Store Performance - {s.get('store')}\n"
                    f"- **Store**: {s.get('store')}\n"
                    f"- **Location**: {s.get('city')}, {s.get('country')}\n"
                    f"- **Total Units Sold**: {s.get('total_units', 0):,} units\n"
                    f"- **Total Aggregated Revenue**: ${s.get('total_revenue', 0):,.2f} USD"
                ),
                "source_type": "neo4j_graph",
                "category": "Store Analytics",
                "authority": 10,
                "score": 0.98,
                "is_graph": True,
                "cypher_preview": "MATCH (s:Store)-[:LOCATED_IN]->(c:City)-[:IN_COUNTRY]->(co:Country)\nOPTIONAL MATCH (s)-[r:SOLD_PRODUCT]->(p:Product)\nRETURN s.name AS store, c.name AS city, co.name AS country, sum(r.total_units) AS total_units, sum(r.revenue) AS total_revenue\nORDER BY total_units DESC LIMIT 6;",
            })

    # Check for specific Apple products / keywords
    apple_match = re.search(r"\b(macbook|airpods|iphone|ipad|apple watch|vision pro|beats)\b", query, re.IGNORECASE)
    if apple_match:
        prod_facts = get_product_graph_context(apple_match.group(1))
        for fact in prod_facts:
            graph_facts.append({
                "doc_id": f"graph_apple_{fact.get('product', 'prod').replace(' ', '_')}",
                "chunk_text": (
                    f"### Neo4j Knowledge Graph Fact: {fact.get('product')}\n"
                    f"- **Category**: {fact.get('category', 'N/A')}\n"
                    f"- **MSRP**: ${fact.get('price', 0):,.2f} | **Launch**: {fact.get('launch_date', 'N/A')}\n"
                    f"- **Global Stores Stocking**: {fact.get('store_count', 0)} stores\n"
                    f"- **Total Aggregated Units Sold**: {fact.get('total_units_sold', 0):,.0f}\n"
                    f"- **Warranty Claims Recorded**: {fact.get('warranty_claims', 0)} claims"
                ),
                "source_type": "neo4j_graph",
                "category": "Graph Analytics",
                "authority": 10,
                "score": 0.98,
                "is_graph": True,
                "cypher_preview": f"MATCH (p:Product)\nWHERE toLower(p.name) CONTAINS toLower('{apple_match.group(1)}')\nOPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)\nOPTIONAL MATCH (s:Store)-[r:SOLD_PRODUCT]->(p)\nRETURN p.name, p.price, p.launch_date, p.total_warranty_claims, count(DISTINCT s) AS store_count LIMIT 5;",
            })

    # 3. Merge Graph Facts with Pinecone Vector Chunks
    combined_chunks = graph_facts + vector_chunks
    logger.info(
        f"Hybrid GraphRAG Retrieval: {len(graph_facts)} graph facts + {len(vector_chunks)} vector chunks merged."
    )

    return combined_chunks[:top_k], used_fallback
