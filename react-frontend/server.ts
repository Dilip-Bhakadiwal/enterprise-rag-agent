import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Comprehensive RAG Knowledge Base for Dilip Bhakadiwal Portfolio & Systems
interface KnowledgeDoc {
  id: string;
  title: string;
  category: "Biography & Credentials" | "Research & Publications" | "Featured Projects" | "Architecture & Stack" | "System Design";
  tags: string[];
  summary: string;
  content: string;
}

const KNOWLEDGE_BASE: KnowledgeDoc[] = [
  {
    id: "kb-01",
    title: "Dilip Bhakadiwal — Biography & Engineering Philosophy",
    category: "Biography & Credentials",
    tags: ["dilip", "bio", "education", "diat", "mtech", "credentials", "engineer"],
    summary: "M.Tech in Artificial Intelligence from DIAT (Defence Institute of Advanced Technology). AI & Backend Engineer building production-grade agentic workflows and edge AI.",
    content: `Dilip Bhakadiwal is an AI & Backend Engineer holding an M.Tech in Artificial Intelligence from DIAT (Defence Institute of Advanced Technology, Pune).
He specializes in bridging the gap between cutting-edge AI research and deployable, ultra-reliable cloud systems.
Key focuses:
- Agentic Workflow Orchestration: Building multi-agent collaborative graphs with cyclic state handling via LangGraph.
- High-Performance Backends: Developing resilient, asynchronous REST and WebSocket microservices using FastAPI.
- Enterprise RAG Systems: Engineering sub-second hybrid retrieval pipelines with vector databases (Pinecone, Qdrant) and contextual rerankers.
- Edge AI & Model Optimization: Quantization, TensorRT, and low-latency inference on restricted compute environments.`
  },
  {
    id: "kb-02",
    title: "Published Research: IEEE Xplore & ICASA (MoES Funded)",
    category: "Research & Publications",
    tags: ["research", "ieee", "icasa", "moes", "publications", "papers", "deep-learning"],
    summary: "Peer-reviewed research published in IEEE Xplore and ICASA, funded by Ministry of Earth Sciences (MoES).",
    content: `Dilip is a published researcher with peer-reviewed work indexed on IEEE Xplore and presented at ICASA:
- Funding & Affiliation: Funded by the Ministry of Earth Sciences (MoES), Government of India.
- Focus Areas: Deep neural networks for predictive geophysical modeling, spatio-temporal sequence analysis, and robust feature representations.
- Rigorous Validation: Benchmarked against high-dimensional atmospheric and sensory datasets with strict statistical significance.
- Impact: Demonstrates proven capability to formulate original mathematical models, conduct empirical scientific research, and translate research into production software.`
  },
  {
    id: "kb-03",
    title: "MarketPulse AI — Real-Time Agentic Financial Terminal",
    category: "Featured Projects",
    tags: ["marketpulse", "finance", "langgraph", "fastapi", "agents", "real-time", "websockets"],
    summary: "Real-time AI financial intelligence terminal orchestrating multi-agent LLM analysis over live market feeds.",
    content: `MarketPulse AI is a flagship production-grade financial terminal:
- Architecture: Multi-agent graph orchestrated via LangGraph with state persistence and backpressure handling.
- Streaming Data Engine: FastAPI async WebSocket streams digesting live ticker feeds, order book depth, and macroeconomic sentiment.
- Agent Roles: Specialized worker agents for Technical Analysis (RSI, MACD, Bollinger), Fundamental Valuation, and News Sentiment extraction.
- Latency & Resilience: Sub-200ms agent decision cycle with automated fallbacks and structured JSON schema enforcement.`
  },
  {
    id: "kb-04",
    title: "Redwood Inference & Enterprise RAG Pipeline",
    category: "Featured Projects",
    tags: ["redwood", "rag", "pinecone", "enterprise", "vector-search", "hybrid", "retrieval"],
    summary: "High-throughput Enterprise RAG infrastructure with sub-second hybrid dense-sparse search and dynamic reranking.",
    content: `Redwood Inference is an enterprise-grade retrieval-augmented generation engine:
- Vector Storage: Pinecone & Qdrant with hybrid dense embeddings + BM25 sparse keyword ranking.
- Advanced RAG Mechanics: Query reformulation, parent-child chunk linking, sliding window context packing, and Cross-Encoder reranking.
- Infrastructure: Containerized on Docker, automated CI/CD to AWS (ECS Fargate, Lambda, API Gateway), monitored with OpenTelemetry.
- Throughput: Sustains 500+ QPS with p95 latency under 180ms.`
  },
  {
    id: "kb-05",
    title: "Core Technical Stack & Engineering Competencies",
    category: "Architecture & Stack",
    tags: ["stack", "skills", "langgraph", "fastapi", "pinecone", "docker", "aws", "python", "pytorch"],
    summary: "Comprehensive breakdown of Dilip's daily toolchain across Agentic AI, Backend, and Cloud Infrastructure.",
    content: `Dilip's Technical Arsenal:
- Agentic & LLM Frameworks: LangGraph, LangChain, LlamaIndex, Ollama, vLLM, Prompt Engineering, Evaluation Benchmarks.
- Backend & Microservices: FastAPI, Python 3.11+, AsyncIO, WebSockets, Pydantic v2, Celery, Redis.
- Vector & Relational Data: Pinecone, Qdrant, ChromaDB, PostgreSQL, pgvector, SQLAlchemy, Drizzle.
- Machine Learning & Edge AI: PyTorch, HuggingFace Transformers, ONNX Runtime, TensorRT, Model Quantization (GGUF/AWQ).
- Cloud & DevOps: Docker, Kubernetes, AWS (ECS, S3, CloudWatch, Lambda), Linux system profiling, GitHub Actions.`
  }
];

// Helper: Simple semantic similarity search for RAG retrieval
function retrieveRelevantKnowledge(query: string, topK: number = 3): KnowledgeDoc[] {
  const queryWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (queryWords.length === 0) return KNOWLEDGE_BASE.slice(0, topK);

  const scored = KNOWLEDGE_BASE.map((doc) => {
    let score = 0;
    const docText = `${doc.title} ${doc.tags.join(" ")} ${doc.summary} ${doc.content}`.toLowerCase();
    
    queryWords.forEach((word) => {
      if (doc.title.toLowerCase().includes(word)) score += 5;
      if (doc.tags.some((t) => t.toLowerCase().includes(word))) score += 4;
      if (doc.summary.toLowerCase().includes(word)) score += 3;
      if (doc.content.toLowerCase().includes(word)) score += 1;
    });

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.doc);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get RAG Knowledge Base Docs
  app.get("/api/knowledge-base", (req, res) => {
    res.json({ documents: KNOWLEDGE_BASE });
  });

  // RAG Chat Endpoint powered by Gemini 3.7 Flash & Grounded Knowledge
  app.post("/api/rag-chat", async (req, res) => {
    try {
      const { message, chatHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Step 1: Retrieve context docs from Knowledge Base
      const retrievedDocs = retrieveRelevantKnowledge(message, 3);
      const contextText = retrievedDocs
        .map(
          (d, idx) =>
            `[DOCUMENT ${idx + 1}: ${d.title}] (Category: ${d.category})\nTags: ${d.tags.join(
              ", "
            )}\n${d.content}`
        )
        .join("\n\n");

      // Step 2: System prompt for RAG Assistant
      const systemInstruction = `You are Dilip Bhakadiwal's interactive AI Portfolio & Research Agent.
You are grounded in Dilip's credentials (M.Tech in AI from DIAT), his published research in IEEE Xplore & ICASA (MoES Funded), his core stack (LangGraph, FastAPI, Pinecone, Docker, AWS), and his flagship projects (MarketPulse AI real-time financial terminal and Redwood Inference Enterprise RAG pipeline).

Your goal is to answer questions about Dilip's engineering philosophy, system architecture designs, agentic workflow orchestration, published research papers, and technical capabilities.

Use the provided RETRIEVED KNOWLEDGE DOCUMENTS to ground your answers accurately and cite documents where appropriate (e.g., [MarketPulse AI], [Published Research]).
Keep answers technically precise, professional, articulate, and impressive.

RETRIEVED KNOWLEDGE BASE CONTEXT:
${contextText}`;

      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        // Fallback demo response if no key is supplied
        const fallbackReply = `Here is grounded context from Dilip Bhakadiwal's technical dossier:\n\n` +
          `**From "${retrievedDocs[0]?.title || 'Dilip Bhakadiwal Profile'}":**\n` +
          `${retrievedDocs[0]?.summary || 'Dilip specializes in orchestrating LLMs using LangGraph & FastAPI to build resilient backend pipelines.'}\n\n` +
          `💡 *Engineering Highlight:* Dilip bridges advanced AI research (IEEE Xplore / MoES funded) with production-grade agentic workflows (MarketPulse AI) and low-latency Enterprise RAG systems (Redwood Inference).`;

        return res.json({
          reply: fallbackReply,
          citations: retrievedDocs.map((d) => ({
            id: d.id,
            title: d.title,
            category: d.category,
            snippet: d.summary,
          })),
        });
      }

      // Format chat history for context
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(chatHistory)) {
        chatHistory.slice(-6).forEach((h: { role: string; content: string }) => {
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        });
      }

      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I was unable to generate a response. Please try again.";

      res.json({
        reply: replyText,
        citations: retrievedDocs.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          snippet: d.summary,
        })),
      });
    } catch (err: any) {
      console.error("Error in /api/rag-chat:", err);
      res.status(500).json({
        error: "Failed to process RAG chat request",
        details: err?.message || "Unknown error",
      });
    }
  });

  // Instant Website Blueprint Generation endpoint
  app.post("/api/generate-website", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const retrievedDocs = retrieveRelevantKnowledge(prompt, 2);
      const contextText = retrievedDocs.map((d) => `${d.title}:\n${d.content}`).join("\n\n");

      const systemInstruction = `You are Blink AI's Instant Website Architect.
Given a one-sentence prompt, synthesize a complete, production-ready website specification with:
1. Brand Identity (Name, Tagline, Brand Vibe, Primary Color Hex, Accent Color Hex)
2. Hero Section Layout Specs (Headline, Subheadline, CTA text, Badge)
3. 3 Core Feature Bento Cards (Title, Description, Icon Name from lucide-react)
4. Social Proof Logos (List of 4 top industry names)
5. Production Tailwind CSS Class Recommendations

Ground your structure in these principles:
${contextText}

Respond ONLY in valid JSON matching this schema:
{
  "brandName": string,
  "tagline": string,
  "heroHeadline": string,
  "heroSubheadline": string,
  "ctaText": string,
  "badgeText": string,
  "theme": {
    "primaryColor": string,
    "accentColor": string,
    "vibe": string
  },
  "features": [
    { "title": string, "description": string, "icon": string }
  ],
  "socialProof": [string, string, string, string],
  "codeSnippet": string
}`;

      if (!process.env.GEMINI_API_KEY) {
        // High quality fallback schema
        return res.json({
          brandName: "Aura AI",
          tagline: "Intelligent Workspaces for Modern Creators",
          heroHeadline: "Your Ideas, Engineered in Real-Time",
          heroSubheadline: "Transform unstructured thoughts into interactive prototypes and production software instantaneously.",
          ctaText: "Launch Studio Free ↗",
          badgeText: "● AI WORKSPACE 2.0",
          theme: {
            primaryColor: "#38bdf8",
            accentColor: "#818cf8",
            vibe: "Cinematic Frost Glass"
          },
          features: [
            { title: "One-Click Neural AST", description: "Compiles conversational prompts straight to semantic React DOM tree.", icon: "Cpu" },
            { title: "Glassmorphic Canvas", description: "Hardware-accelerated optical blur tokens tailored for multi-device viewing.", icon: "Layers" },
            { title: "Instant Global CDN", description: "Zero-configuration edge deployment with automated SSL and asset caching.", icon: "Zap" }
          ],
          socialProof: ["Figma", "Linear", "Vercel", "Supabase"],
          codeSnippet: `<div className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-2xl p-8 text-white shadow-2xl">\n  <h1 className="text-4xl font-bold tracking-tight">Your Ideas, Engineered</h1>\n  <p className="text-slate-300 mt-2">Production code generated in 1.4s</p>\n</div>`
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Error in /api/generate-website:", err);
      res.status(500).json({
        error: "Failed to generate website specification",
        details: err?.message || "Unknown error",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Blink AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
