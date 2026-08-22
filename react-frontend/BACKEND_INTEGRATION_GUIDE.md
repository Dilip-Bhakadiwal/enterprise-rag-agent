# 🛠️ Backend Integration & Developer Architecture Guide
> **Dilip Bhakadiwal — Portfolio & AI Systems Application**
> This guide outlines how to safely extend, connect, and customize backend services (Express, Python FastAPI, LangGraph, Vector Databases) without breaking UI layout, fonts, or animations.

---

## 🏛️ 1. Architecture Overview

```
├── server.ts                 # Full-stack Node.js / Express Server (Port 3000)
│   ├── /api/health           # Health check endpoint
│   ├── /api/knowledge-base   # Retrieval knowledge base metadata
│   └── /api/rag-chat         # Enterprise RAG agent powered by Gemini 3.7 Flash + Knowledge Base
│
├── src/
│   ├── services/
│   │   └── api.ts            # Centralized Frontend-to-Backend API Client (with Auto-Fallback)
│   │
│   ├── components/
│   │   ├── RagChatPanel.tsx  # Interactive RAG Chat Window (uses src/services/api.ts)
│   │   ├── ProjectsModal.tsx # Project showcases & architectural breakdown
│   │   ├── ResumeModal.tsx   # Verified official resume viewer & PDF exporter
│   │   ├── HeroContent.tsx   # Display headline, subheadline, and action buttons
│   │   ├── Navbar.tsx        # Navigation header & brand logo
│   │   └── SocialProof.tsx   # IEEE Xplore, DIAT, MoES credentials strip
│   │
│   ├── types.ts              # TypeScript interfaces (ChatMessage, Citation, KnowledgeDoc, etc.)
│   └── index.css             # Tailwind CSS tokens, fonts (Outfit, Plus Jakarta Sans, Roboto)
│
└── .env.example              # Environment variables template
```

---

## 🔌 2. How to Connect Your Backend

You have **two flexible options** depending on your stack:

### Option A: Extend the Built-in TypeScript Express Backend (`server.ts`)
*Best for: Zero-setup deployment, Node.js microservices, direct Gemini API integration.*

1. Open `server.ts`.
2. Add your custom routes under the `// API routes` section:
   ```typescript
   // Example: Contact Form or Project Analytics Endpoint
   app.post("/api/contact", async (req, res) => {
     try {
       const { name, email, message } = req.body;
       // TODO: Forward to SendGrid / Resend / Database
       res.json({ success: true, message: "Message received" });
     } catch (err: any) {
       res.status(500).json({ error: err.message });
     }
   });
   ```
3. To connect a **Vector Database** (e.g., Pinecone, Qdrant, ChromaDB, or pgvector):
   - Replace the `retrieveRelevantKnowledge()` function in `server.ts` with your vector database query.
   - Pass the retrieved chunks into `ai.models.generateContent()` prompt context.

---

### Option B: Connect an External Backend (Python FastAPI / LangGraph / Django)
*Best for: Running existing Python LangGraph agents, PyTorch models, Celery workers, or remote microservices.*

1. **Configure Environment Variable**:
   In your `.env` file, set:
   ```env
   VITE_API_BASE_URL="http://localhost:8000"
   # Or for production:
   # VITE_API_BASE_URL="https://api.yourdomain.com"
   ```

2. **Frontend Connection (`src/services/api.ts`)**:
   - `src/services/api.ts` automatically prepends `VITE_API_BASE_URL` to all API calls.
   - If `VITE_API_BASE_URL` is empty, it communicates with the local `server.ts`.

3. **FastAPI CORS Configuration**:
   Make sure your FastAPI application enables CORS for the frontend origin:
   ```python
   # main.py (FastAPI)
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware

   app = FastAPI(title="Dilip AI Agent Service")

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"], # Or specific frontend domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

## 📡 3. API Endpoint Contracts & Payloads

### `POST /api/rag-chat`
Used by the RAG Chat Window (`RagChatPanel.tsx`) to query Dilip's AI agent.

#### Request Body (`JSON`):
```json
{
  "message": "Tell me about Dilip's MarketPulse AI project",
  "chatHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I assist you with Dilip's work?" }
  ]
}
```

#### Response Body (`JSON`):
```json
{
  "reply": "**MarketPulse AI** is a real-time agentic financial terminal...",
  "citations": [
    {
      "id": "kb-03",
      "title": "MarketPulse AI — Real-Time Agentic Financial Terminal",
      "category": "Featured Projects",
      "snippet": "Multi-agent LangGraph workflow with FastAPI async WebSocket data pipelines."
    }
  ]
}
```

---

## 🛡️ 4. Golden Rules for Developers (To Keep the Work Protected)

To ensure the UI, styling, and animations stay pristine while you or teammates add features:

1. **Keep Backend Calls in `src/services/api.ts`**:
   - Do **not** write raw `fetch()` or `axios` calls directly inside UI components.
   - Always export typed functions from `src/services/api.ts`.

2. **Always Maintain Safe Fallbacks**:
   - `src/services/api.ts` includes an offline fallback engine (`getLocalRagFallback`).
   - If the backend is ever offline or an API key is temporarily missing, the UI gracefully renders response data rather than throwing an unhandled runtime error.

3. **Never Expose Private API Keys on Client-Side**:
   - Secret tokens (OpenAI, Gemini, Pinecone, AWS keys) must **only** live in `server.ts` or external Python backends (`process.env.KEY` / `os.environ["KEY"]`).
   - Only non-sensitive public variables should use the `VITE_` prefix.

4. **Do Not Alter Global CSS or Video Configuration**:
   - `src/index.css` contains custom typography calibrations (`font-blink-display`, `hero-blink-gradient`) and iOS Safari video attributes (`playsInline`, `safe-area-inset`).
   - Leave `src/components/HeroBackground.tsx` and `src/index.css` intact to preserve high-contrast dark theme fidelity.

---

## 🚀 5. Common Commands

- **Start Dev Server**: `npm run dev` (Starts backend + Vite on port 3000)
- **Check Types & Lint**: `npm run lint`
- **Production Build**: `npm run build`
