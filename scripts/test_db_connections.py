import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from neo4j import GraphDatabase
from pinecone import Pinecone
from app.config import settings

print("=" * 70)
print("🔍 TESTING PINECONE & NEO4J AURA CONNECTIONS")
print("=" * 70)

# 1. Test Pinecone
print("\n🌲 [1/2] Testing Pinecone API Key & Index...")
try:
    pc = Pinecone(api_key=settings.pinecone_api_key)
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    print(f"  ✅ Pinecone Connected! Existing indexes: {existing_indexes}")
    
    if settings.pinecone_index_name in existing_indexes:
        index = pc.Index(settings.pinecone_index_name)
        stats = index.describe_index_stats()
        print(f"  📊 Index '{settings.pinecone_index_name}' Stats: {stats}")
    else:
        print(f"  ℹ️ Index '{settings.pinecone_index_name}' not found. Needs creation.")
except Exception as exc:
    print(f"  ❌ Pinecone error: {exc}")

# 2. Test Neo4j
print("\n🕸️ [2/2] Testing Neo4j AuraDB Connection...")
print(f"  Configured URI: {settings.neo4j_uri}")
print(f"  Configured User: {settings.neo4j_username}")

schemes = ["neo4j+s", "neo4j+ssc", "bolt+s", "bolt+ssc"]
users = [settings.neo4j_username, "neo4j"]
connected = False

for scheme in schemes:
    host = settings.neo4j_uri.split("://")[-1] if "://" in settings.neo4j_uri else settings.neo4j_uri
    uri = f"{scheme}://{host}"
    for u in users:
        try:
            driver = GraphDatabase.driver(uri, auth=(u, settings.neo4j_password))
            driver.verify_connectivity()
            with driver.session() as s:
                res = s.run("MATCH (n) RETURN count(n) as c").single()
                count = res["c"]
            print(f"  ✅ SUCCESS! Connected to {uri} with username '{u}'. Node count = {count}")
            connected = True
            break
        except Exception as exc:
            print(f"  ⚠️ Tried {uri} (user: {u}) -> {exc}")
    if connected:
        break

if not connected:
    print("  ❌ Could not connect to Neo4j with configured credentials.")

print("=" * 70 + "\n")
