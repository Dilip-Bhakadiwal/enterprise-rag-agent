import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, User, FileText, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { ChatMessage, KnowledgeDoc, Citation } from "../types";

// Point to our real FastAPI backend.
// In dev, Vite proxy forwards /api/ask → http://localhost:8000/ask
// In production, set VITE_BACKEND_URL to your Render URL (e.g. https://your-app.onrender.com)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface RagChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const DEFAULT_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "doc-profile",
    title: "Dilip Bhakadiwal Profile & Education",
    category: "Biography & Credentials",
    summary: "M.Tech in Artificial Intelligence from Defence Institute of Advanced Technology (DIAT), Pune.",
    content: "Dilip Bhakadiwal is an AI & Backend Engineer holding a Master of Technology (M.Tech) in Artificial Intelligence from the Defence Institute of Advanced Technology (DIAT, DRDO). His expertise centers on Agentic LLM Architectures (LangGraph, Autogen), Low-Latency Async APIs (FastAPI, Redis, WebSockets), Enterprise RAG Search (Pinecone, Qdrant, BM25, Cross-Encoders), and Production Machine Learning (PyTorch, Spatio-Temporal Modeling).",
    tags: ["DIAT", "MTech", "AI Engineer", "Backend", "FastAPI"]
  },
  {
    id: "doc-marketpulse",
    title: "MarketPulse AI — Real-Time Agentic Financial Terminal",
    category: "Featured Projects",
    summary: "Stateful LangGraph multi-agent financial engine running on async FastAPI WebSockets.",
    content: "MarketPulse AI is an agentic financial terminal that ingests live market depth and price tickers. It routes analysis through specialized worker agents (Technical Indicators, Valuation, News Sentiment) coordinated via LangGraph state charts with deterministic fallback routes. The pipeline executes end-to-end in under 200ms with strict Pydantic v2 validation.",
    tags: ["MarketPulse AI", "LangGraph", "FastAPI", "WebSockets", "Finance"]
  },
  {
    id: "doc-redwood",
    title: "Redwood Inference — Enterprise RAG & Hybrid Retrieval",
    category: "Featured Projects",
    summary: "Two-stage hybrid dense-sparse vector pipeline with Cross-Encoder reranking.",
    content: "Redwood Inference is an enterprise retrieval-augmented generation engine engineered for high-throughput semantic queries. Combines OpenAI text-embedding-3-large vectors in Pinecone with lexical BM25 token indices. Utilizes a secondary Cross-Encoder reranker to minimize hallucination rates by 64% and achieves p95 latencies under 180ms on AWS ECS Fargate.",
    tags: ["Redwood Inference", "RAG", "Pinecone", "Cross-Encoder", "AWS Fargate"]
  },
  {
    id: "doc-research",
    title: "Geophysical Deep Learning Research (MoES Funded)",
    category: "Research & Publications",
    summary: "Published deep learning meteorological research in IEEE Xplore and ICASA.",
    content: "Funded by the Ministry of Earth Sciences (MoES), Government of India, Dilip formulated spatio-temporal deep neural networks (CNN-LSTM hybrids) for high-dimensional atmospheric time-series data. The research is peer-reviewed and indexed in IEEE Xplore digital library and presented at the International Conference on Applied Sciences and Automation (ICASA).",
    tags: ["IEEE Xplore", "MoES", "ICASA", "PyTorch", "Atmospheric AI"]
  }
];

export const RagChatPanel: React.FC<RagChatPanelProps> = ({
  isOpen,
  onClose,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am Dilip's Enterprise Rag Agent. Ask me anything about MarketPulse AI, Redwood Inference, LangGraph multi-agent pipelines, or Dilip's IEEE published research.",
      timestamp: "Just now"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ─── Real FastAPI backend call ────────────────────────────────────────────
  const [thinkingStep, setThinkingStep] = useState("");

  const callRagBackend = async (userQuery: string) => {
    // Show live agentic thinking steps while waiting for the backend
    const steps = [
      "Routing query...",
      "Decomposing sub-queries...",
      "Searching Pinecone...",
      "Grading documents...",
      "Synthesizing answer...",
    ];
    let stepIdx = 0;
    setThinkingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setThinkingStep(steps[stepIdx]);
    }, 700);

    try {
      const res = await fetch(`${BACKEND_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery }),
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Map backend sources → Citation pills
      // Our FastAPI returns: { answer, sources: [{doc_id, source_type, timestamp, author}], intent, response_time_ms }
      const citations: Citation[] = (data.sources || []).map((s: any, idx: number) => ({
        id: s.doc_id || `src-${idx}`,
        title: s.doc_id || `Source ${idx + 1}`,
        category: s.source_type || "Document",
        snippet: s.timestamp ? `${s.source_type} · ${s.timestamp}` : s.source_type || "",
      }));

      return {
        responseText: data.answer || "No answer returned from the backend.",
        citations,
        meta: {
          intent: data.intent,
          response_time_ms: data.response_time_ms,
          provider: data.provider_used,
        },
      };
    } finally {
      clearInterval(stepInterval);
      setThinkingStep("");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    const userMessageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsLoading(true);

    try {
      const { responseText, citations, meta } = await callRagBackend(text.trim());
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations,
      };
      setMessages((prev) => [...prev, botMsg]);
      // Log performance metadata to console for debugging
      if (meta) {
        console.info(`[RAG] intent=${meta.intent} | provider=${meta.provider} | ${meta.response_time_ms}ms`);
      }
    } catch (err: any) {
      console.error("RAG backend error:", err);
      // Show a friendly error bubble instead of crashing
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Could not reach the backend. Please ensure the server is running.\n\nError: ${err?.message || "Unknown error"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          citations: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isExpanded ? "p-0" : "p-2 sm:p-6 md:p-8"} bg-transparent transition-all duration-300`}>
      {/* Backdrop clickable overlay with no darkening or blurring */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
        aria-label="Close Assistant Window" 
      />
      
      {/* Glassmorphic Centered Window Container with 75% background visibility & orange-yellow gradient accents */}
      <div
        className={`relative z-10 w-full ${
          isExpanded ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" : "max-w-3xl h-[88dvh] sm:h-[680px] max-h-[92dvh] rounded-3xl"
        } flex flex-col glass-panel-rag text-white shadow-2xl overflow-hidden transition-all duration-300 animate-in zoom-in-95 font-gemini`}
      >
        {/* Header with Enterprise Rag Agent Name and Window Controls in Orange-Yellow Gradient */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] via-orange-500/[0.05] to-transparent shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img 
              src="/dilip_web_app_logo.png" 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" 
            />
            <div>
              <h2 className="font-gemini font-semibold text-sm sm:text-lg tracking-normal bg-gradient-to-r from-amber-200 via-orange-200 to-yellow-100 bg-clip-text text-transparent">
                Enterprise Rag Agent
              </h2>
            </div>
          </div>

          {/* Right Window Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 sm:p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-amber-200 transition-colors cursor-pointer"
              title={isExpanded ? "Restore window size" : "Maximize to full screen"}
              aria-label="Maximize / Minimize"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              id="rag-panel-close-btn"
              onClick={onClose}
              className="p-2 sm:p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Window"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Window Body (Transparent 75% visibility) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
          {/* Chat message list with iOS momentum scroll */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 ios-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in duration-200`}
              >
                {msg.role === "assistant" && (
                  <img 
                    src="/dilip_web_app_logo.png" 
                    alt="Agent" 
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 mt-0.5" 
                  />
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4.5 text-[13px] sm:text-[14px] leading-[1.65] font-normal ${
                    msg.role === "user"
                      ? "bg-amber-950/40 text-amber-50 border border-amber-400/35 shadow-md backdrop-blur-md"
                      : "bg-black/35 text-slate-100 border border-white/15 shadow-md backdrop-blur-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-gemini font-normal tracking-normal">{msg.content}</div>

                  {/* Citations Grounding Pill Box */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-amber-500/20">
                      <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5 mb-2">
                        <FileText className="w-3 h-3 text-amber-400" /> Grounded Citations ({msg.citations.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cit, cIdx) => (
                          <div
                            key={cIdx}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 text-[11px] text-amber-100 transition-all flex items-center gap-1.5"
                            title={cit.snippet}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 shrink-0" />
                            <span className="font-medium truncate max-w-[170px] sm:max-w-[210px]">{cit.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/25 border border-amber-400/40 flex items-center justify-center text-amber-200 shrink-0 mt-0.5 shadow-sm">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 sm:gap-3.5 justify-start animate-in fade-in duration-200">
                <img 
                  src="/dilip_web_app_logo.png" 
                  alt="Agent Loading" 
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 animate-pulse" 
                />
                <div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 border border-amber-500/20 flex items-center gap-2.5 text-xs sm:text-[13px] text-amber-100 shadow-sm font-gemini">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-mono tracking-wide uppercase text-[11px]">{thinkingStep || "Thinking..."}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar Styled with Orange-Yellow Accent & 16px mobile font to prevent iOS Safari auto-zoom */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 sm:p-5 border-t border-amber-500/20 bg-black/20 flex items-center gap-2 font-gemini"
          >
            <div className="relative flex-1">
              <input
                id="rag-chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Dilip's projects or research..."
                className="w-full bg-white/[0.07] border border-white/20 rounded-2xl px-4 py-3 sm:py-3.5 text-base sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400/70 focus:bg-white/[0.12] focus:ring-1 focus:ring-amber-400/30 transition-all shadow-inner font-gemini"
                disabled={isLoading}
              />
            </div>

            <button
              id="rag-chat-send-btn"
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 sm:px-5 py-3 sm:py-3.5 min-h-[44px] rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:via-orange-300 hover:to-yellow-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
