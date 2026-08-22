import React, { useState, useRef, useEffect } from "react";
import { X, Send, User, FileText, Maximize2, Minimize2, Sparkles, ExternalLink, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, Citation, KnowledgeDoc } from "../types";
import { sendRagMessage } from "../services/api";
import { CitationDrawer } from "./CitationDrawer";
import { TelemetryBadge } from "./TelemetryBadge";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface RagChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const RagChatPanel: React.FC<RagChatPanelProps> = ({
  isOpen,
  onClose,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am Dilip's Enterprise RAG Agent — powered by Pinecone vector search, NVIDIA Embeddings, and LangGraph. I can provide detailed information about Dilip Bhakadiwal's skills, flagship AI projects, credentials, and published research. Additionally, this system is engineered to query enterprise-scale knowledge bases benchmarked on onyx-dot-app/EnterpriseRAG-Bench (Confluence, GitHub, Jira, Slack, and Gmail).",
      timestamp: "Just now",
      suggestions: [
        "What research has Dilip published with MoES funding?",
        "How is MarketPulse AI's LangGraph multi-agent pipeline designed?",
        "What is the recommended liability cap language in procurement SOPs?"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [thinkingStep, setThinkingStep] = useState("Synthesizing response...");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeCitationsList, setActiveCitationsList] = useState<Citation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ─── Agentic thinking step animation ────────────────────────────────────
  const THINKING_STEPS = [
    "Routing intent & source filter...",
    "Decomposing multi-hop sub-queries...",
    "Embedding query (NVIDIA NIM 1024-dim)...",
    "Querying Pinecone Vector Index...",
    "Grading retrieved documents...",
    "Synthesizing answer with Llama 3.3...",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsLoading(true);

    // Cycle through agentic thinking steps while waiting for backend
    let stepIdx = 0;
    setThinkingStep(THINKING_STEPS[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % THINKING_STEPS.length;
      setThinkingStep(THINKING_STEPS[stepIdx]);
    }, 600);

    try {
      const { reply, citations, suggestions, telemetry } = await sendRagMessage(text.trim(), messages);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations,
        suggestions,
        telemetry,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Could not reach the RAG backend.\n\nError: ${err?.message || "Unknown error"}\n\nMake sure the FastAPI server is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          citations: [],
        },
      ]);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleOpenCitation = (citation: Citation, allInMsg?: Citation[]) => {
    setSelectedCitation(citation);
    setActiveCitationsList(allInMsg || [citation]);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isExpanded ? "p-0" : "p-2 sm:p-6 md:p-8"} bg-transparent transition-all duration-300`}>
      {/* Backdrop clickable overlay */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
        aria-label="Close Assistant Window" 
      />
      
      {/* Glassmorphic Centered Window Container */}
      <div
        className={`relative z-10 w-full ${
          isExpanded ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" : "max-w-3xl h-[88dvh] sm:h-[700px] max-h-[92dvh] rounded-3xl"
        } flex flex-col glass-panel-rag text-white shadow-2xl overflow-hidden transition-all duration-300 animate-in zoom-in-95 font-gemini`}
      >
        {/* Header with Enterprise Rag Agent Name and Window Controls */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] via-orange-500/[0.05] to-transparent shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img 
              src={dilipLogo} 
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

        {/* Chat Window Body */}
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
                    src={dilipLogo} 
                    alt="Agent" 
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 mt-0.5" 
                  />
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4.5 text-[13px] sm:text-[14px] leading-[1.65] font-normal ${
                    msg.role === "user"
                      ? "bg-amber-950/40 text-amber-50 border border-amber-400/35 shadow-md backdrop-blur-md"
                      : "bg-black/40 text-slate-100 border border-white/15 shadow-md backdrop-blur-md"
                  }`}
                >
                  {/* Rich Markdown Response Body */}
                  <div className="font-gemini text-[13px] sm:text-[14px] leading-[1.7] text-slate-100 markdown-content select-text">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-sm sm:text-base font-bold text-amber-200 mt-2.5 mb-1.5 border-b border-amber-500/20 pb-0.5" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-xs sm:text-sm font-bold text-amber-200 mt-2.5 mb-1 border-b border-amber-500/20 pb-0.5" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-xs sm:text-[13.5px] font-semibold text-amber-300 mt-2.5 mb-1 flex items-center gap-1.5" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-outside ml-4 mb-2.5 space-y-1 text-slate-200" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-outside ml-4 mb-2.5 space-y-1 text-slate-200" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-white bg-white/[0.06] px-1 py-0.2 rounded" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a className="text-sky-400 hover:text-sky-300 underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => (
                          <code className="px-1.5 py-0.5 rounded bg-black/50 text-amber-200 font-mono text-[11px] sm:text-xs border border-white/10" {...props}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Interactive Citations Grounding Pill Box (Click to Inspect) */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-amber-500/20">
                      <div className="text-[11px] font-medium text-amber-300 flex items-center justify-between gap-1.5 mb-2">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-amber-400" /> Grounded Citations ({msg.citations.length}):
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Click to inspect chunk</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => handleOpenCitation(cit, msg.citations)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-400/25 hover:border-amber-400/50 text-[11px] text-amber-100 transition-all flex items-center gap-1.5 group cursor-pointer active:scale-95 text-left"
                            title="Click to view full source text & metadata"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 shrink-0 group-hover:scale-125 transition-transform" />
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{cit.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-amber-400/70 group-hover:text-amber-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Smart Follow-up Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10">
                      <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Follow-ups:
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="text-left px-3 py-1.5 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/20 border border-amber-400/20 hover:border-amber-400/40 text-[11.5px] sm:text-[12px] text-amber-100 hover:text-white transition-all flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                          >
                            <span className="text-amber-400 font-bold">↳</span>
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dev Telemetry & FinOps Waterfall */}
                  <TelemetryBadge telemetry={msg.telemetry} />
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
                  src={dilipLogo} 
                  alt="Agent Loading" 
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 animate-pulse" 
                />
                <div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 border border-amber-500/20 flex items-center gap-2.5 text-xs sm:text-[13px] text-amber-100 shadow-sm font-gemini">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-mono tracking-wide uppercase text-[11px]">{thinkingStep}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
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
                placeholder="Ask about Dilip's research, projects, or enterprise datasets..."
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

      {/* Slide-out Interactive Citation Inspector Drawer */}
      <CitationDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
        allCitations={activeCitationsList}
        onSelectCitation={(cit) => setSelectedCitation(cit)}
      />
    </div>
  );
};
