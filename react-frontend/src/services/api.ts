import { ChatMessage, Citation, KnowledgeDoc, Telemetry } from "../types";

/**
 * Backend API Client — Enterprise RAG Integration
 *
 * Connected to: FastAPI backend (app/main.py) via POST /ask
 *
 * HOW IT WORKS:
 *  - In LOCAL DEV:  Vite proxy forwards /ask → http://localhost:8000/ask (no CORS)
 *  - In PRODUCTION: Set VITE_API_BASE_URL to your Render/deployed backend URL
 *
 * FALLBACK: If the backend is unreachable, getLocalRagFallback() returns
 *           curated static content so the UI never breaks.
 */

const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string) || "";

// ─── Public Types ──────────────────────────────────────────────────────────

export interface RagChatRequest {
  message: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface RagChatResponse {
  answer: string;
  reply: string;
  citations: Citation[];
  suggestions?: string[];
  telemetry?: Telemetry;
  meta?: {
    intent?: string;
    response_time_ms?: number;
    provider_used?: string;
  };
}

// ─── Main RAG Chat Function ────────────────────────────────────────────────

/**
 * Sends a question to our FastAPI Enterprise RAG backend (POST /ask).
 *
 * FastAPI Request:  { question: string }
 * FastAPI Response: { answer, sources: [{doc_id, source_type, timestamp, author}],
 *                    intent, provider_used, used_fallback, response_time_ms }
 *
 * The response is mapped to the frontend's RagChatResponse shape,
 * then passed to RagChatPanel for rendering.
 */
export async function sendRagMessage(
  message: string,
  chatHistory: ChatMessage[] = []
): Promise<RagChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: message }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Format citations with full chunk text and metadata for the inspector
    const citations: Citation[] = (data.sources || []).map(
      (s: any, idx: number) => {
        const rawId = s.doc_id || `src-${idx + 1}`;
        const isGraph = s.source_type === "neo4j_graph" || rawId.startsWith("neo4j_") || rawId.startsWith("graph_");
        let cleanTitle = rawId;
        let category = isGraph ? "NEO4J GRAPH" : (s.source_type || "document").toUpperCase();

        if (isGraph) {
          const cleanName = rawId
            .replace(/^neo4j_(warranty|store|samsung|apple)_\d*_?/, "")
            .replace(/^graph_/, "")
            .replace(/_/g, " ");
          cleanTitle = `🕸️ ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
          category = s.category || "Knowledge Graph";
        } else if (rawId.startsWith("portfolio_")) {
          category = "PORTFOLIO";
          const topic = rawId.replace("portfolio_", "").replace(/_/g, " ");
          cleanTitle = `🌟 Dilip · ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
        } else if (rawId.startsWith("dsid_")) {
          cleanTitle = `📄 ${category} · Doc [${idx + 1}]`;
        }

        return {
          id: rawId,
          doc_id: rawId,
          title: cleanTitle,
          category,
          source_type: s.source_type || (isGraph ? "neo4j_graph" : "document"),
          is_graph: isGraph,
          entity_type: isGraph ? (rawId.includes("store") ? "Retail Store" : rawId.includes("warranty") ? "Warranty Defect" : "Product Intelligence") : "Semantic Vector",
          author: s.author || (isGraph ? "Neo4j AuraDB Knowledge Graph" : "System / Enterprise"),
          timestamp: s.timestamp || (isGraph ? "Live Graph Query" : "Official Release"),
          chunk_text: s.chunk_text || "",
          score: s.score,
          snippet: [s.author || (isGraph ? "Neo4j AuraDB" : null), s.timestamp, s.source_type]
            .filter(Boolean)
            .join(" · ") || category,
        };
      }
    );

    // Log performance info to browser console for debugging
    if (data.response_time_ms) {
      console.info(
        `[RAG] intent=${data.intent} | provider=${data.provider_used} | ${data.response_time_ms}ms`
      );
    }

    return {
      answer: data.answer || "No answer returned from the backend.",
      reply: data.answer || "No answer returned from the backend.",
      citations,
      suggestions: data.suggestions || [],
      telemetry: data.telemetry,
      meta: {
        intent: data.intent,
        response_time_ms: data.response_time_ms,
        provider_used: data.provider_used,
      },
    };
  } catch (error) {
    console.warn(
      "[RAG] Backend unreachable, using local fallback:",
      error
    );
    // Graceful degradation: never let a backend error crash the UI
    return getLocalRagFallback(message);
  }
}

// ─── Live Dynamic Hero Metrics ─────────────────────────────────────────────
export interface HeroStats {
  vectors_indexed: string;
  total_vectors?: number;
  graph_nodes?: number;
  graph_relationships?: number;
  agentic_latency_ms: number;
  latency_display: string;
  failover_tier?: string;
  knowledge_graph_status?: string;
}

/**
 * Fetches cached dynamic metrics for Hero section from FastAPI backend.
 * Zero search read/write units burned on Pinecone free tier.
 */
export async function fetchLiveHeroStats(): Promise<HeroStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`);
    if (!res.ok) throw new Error(`Stats returned ${res.status}`);
    return await res.json();
  } catch {
    return {
      vectors_indexed: "61.5K+",
      total_vectors: 61500,
      graph_nodes: 286,
      graph_relationships: 7271,
      agentic_latency_ms: 180,
      latency_display: "<200ms",
      failover_tier: "3-Tier",
      knowledge_graph_status: "connected",
    };
  }
}

// ─── Health Check ──────────────────────────────────────────────────────────

/**
 * Pings the FastAPI /health endpoint.
 */
export async function checkBackendHealth(): Promise<{
  status: string;
  timestamp?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch {
    return { status: "offline" };
  }
}

// ─── Knowledge Base (optional) ─────────────────────────────────────────────

/**
 * Fetches knowledge base documents — not exposed by our FastAPI,
 * returns empty array gracefully.
 */
export async function fetchKnowledgeBase(): Promise<KnowledgeDoc[]> {
  return [];
}

// ─── Local Fallback Engine ─────────────────────────────────────────────────
// Guarantees the UI renders meaningful content even when backend is offline.

function getLocalRagFallback(queryText: string): RagChatResponse {
  const query = queryText.toLowerCase();

  if (
    query.includes("marketpulse") ||
    query.includes("agent") ||
    query.includes("langgraph") ||
    query.includes("finance")
  ) {
    const text = `**MarketPulse AI** is a real-time agentic financial intelligence terminal engineered by Dilip:\n\n• **Multi-Agent Orchestration**: Utilizes LangGraph stateful cyclic graphs with persistent state checkpoints to coordinate valuation, technical analysis, and sentiment worker agents.\n• **Low-Latency Backend**: FastAPI with asynchronous WebSockets delivering sub-200ms end-to-end response times.\n• **Data Validation**: Strict Pydantic v2 schemas preventing schema drift during high-frequency live ticker processing.`;
    return {
      answer: text,
      reply: text,
      citations: [
        {
          id: "kb-03",
          title: "MarketPulse AI — Real-Time Agentic Financial Terminal",
          category: "Featured Projects",
          snippet:
            "Multi-agent LangGraph workflow with FastAPI async WebSocket data pipelines.",
        },
      ],
    };
  }

  if (
    query.includes("redwood") ||
    query.includes("rag") ||
    query.includes("pinecone") ||
    query.includes("retrieval")
  ) {
    const text = `**Redwood Inference** is an enterprise-grade hybrid retrieval engine:\n\n• **Hybrid Search**: Fuses dense vectors from Pinecone with sparse BM25 lexical token indices for balanced precision and recall.\n• **Reranking**: Secondary Cross-Encoder reranker reduces LLM hallucinations by 64%.\n• **Infrastructure**: Deployed as containerized microservices on AWS ECS Fargate with sub-180ms p95 latency.`;
    return {
      answer: text,
      reply: text,
      citations: [
        {
          id: "kb-04",
          title: "Redwood Inference & Enterprise RAG Pipeline",
          category: "Featured Projects",
          snippet:
            "Enterprise RAG with Pinecone hybrid search and sub-180ms p95 latency.",
        },
      ],
    };
  }

  if (
    query.includes("research") ||
    query.includes("ieee") ||
    query.includes("moes") ||
    query.includes("icasa") ||
    query.includes("paper")
  ) {
    const text = `Dilip conducted deep learning research funded by the **Ministry of Earth Sciences (MoES), Government of India**:\n\n• Formulated novel spatio-temporal deep neural architectures for predictive atmospheric time-series.\n• Published and indexed in **IEEE Xplore** and presented at the **ICASA** conference.`;
    return {
      answer: text,
      reply: text,
      citations: [
        {
          id: "kb-02",
          title: "Published Research: IEEE Xplore & ICASA (MoES Funded)",
          category: "Research & Publications",
          snippet:
            "Peer-reviewed research published in IEEE Xplore funded by Ministry of Earth Sciences.",
        },
      ],
    };
  }

  const defaultText = `Dilip Bhakadiwal is an **AI & Backend Engineer** with an M.Tech in Artificial Intelligence from the Defence Institute of Advanced Technology (DIAT, DRDO).\n\nHe specializes in:\n1. **Production Agentic Workflows** (LangGraph, FastAPI, Redis)\n2. **Enterprise RAG Systems** (Pinecone, Hybrid Dense/Sparse Search, Cross-Encoders)\n3. **Scalable Backend Microservices** (Docker, AWS ECS, WebSockets)`;
  return {
    answer: defaultText,
    reply: defaultText,
    citations: [
      {
        id: "kb-01",
        title: "Dilip Bhakadiwal — Biography & Engineering Philosophy",
        category: "Biography & Credentials",
        snippet:
          "M.Tech in AI from DIAT. Specializes in production-grade agentic workflows and edge AI.",
      },
    ],
  };
}
