import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Send, 
  User, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  ExternalLink, 
  CornerDownRight 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, Citation } from "../types";
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
      content: "Hello! I am Dilip's Enterprise RAG Agent — powered by Pinecone vector search, NVIDIA Embeddings, and LangGraph.\n\nI can provide detailed information about Dilip Bhakadiwal's skills, flagship AI projects, credentials, and published research. Additionally, this system is engineered to query enterprise-scale knowledge bases benchmarked on onyx-dot-app/EnterpriseRAG-Bench (Confluence, GitHub, Jira, Slack, and Gmail).",
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
          content: `Could not reach the RAG backend.\n\nError: ${err?.message || "Unknown error"}\n\nPlease check your internet connection or verify the server is running.`,
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

  // Helper to format citation titles in a clean, human-readable way
  const formatCitationPillTitle = (cit: Citation, idx: number): string => {
    const rawId = cit.doc_id || cit.id || "";
    if (rawId.startsWith("portfolio_")) {
      const topic = rawId.replace("portfolio_", "").replace(/_/g, " ");
      return `Dilip · ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    }
    const cat = (cit.category || cit.source_type || "Doc").toUpperCase();
    return `${cat} · Doc [${idx + 1}]`;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isExpanded ? "p-0" : "p-2 sm:p-6 md:p-8"} bg-transparent transition-all duration-300`}>
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
        aria-label="Close Assistant Window" 
      />
      
      {/* Glassmorphic Centered Window */}
      <div
        className={`relative z-10 w-full ${
          isExpanded ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" : "max-w-3xl h-[88dvh] sm:h-[700px] max-h-[92dvh] rounded-3xl"
        } flex flex-col glass-panel-rag text-white shadow-2xl overflow-hidden transition-all duration-300 font-sans`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/[0.06] via-transparent to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={dilipLogo} 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0" 
            />
            <div>
              <h2 className="font-semibold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                <span>Enterprise RAG Assistant</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Online
                </span>
              </h2>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? "Restore window size" : "Maximize to full screen"}
              aria-label="Maximize / Minimize"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              id="rag-panel-close-btn"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Window"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Window Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 ios-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-3.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in duration-200`}
              >
                {msg.role === "assistant" && (
                  <img 
                    src={dilipLogo} 
                    alt="Agent" 
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 mt-1" 
                  />
                )}

                <div
                  className={`max-w-[90%] sm:max-w-[84%] rounded-2xl p-4 sm:p-5 text-[13.5px] sm:text-[14px] leading-[1.75] font-normal ${
                    msg.role === "user"
                      ? "bg-amber-500/15 text-amber-50 border border-amber-400/30 shadow-md backdrop-blur-md"
                      : "bg-[#0b101f]/90 text-slate-100 border border-white/10 shadow-lg backdrop-blur-md"
                  }`}
                >
                  {/* Clean Markdown Response Body */}
                  <div className="text-[13.5px] sm:text-[14px] leading-[1.8] text-slate-200 markdown-content select-text font-sans">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-base sm:text-lg font-bold text-amber-100 mt-3.5 mb-2 border-b border-white/10 pb-1 tracking-tight" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-sm sm:text-base font-semibold text-amber-200/95 mt-3 mb-1.5 tracking-tight" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-[13.5px] sm:text-sm font-semibold text-amber-300/90 mt-2.5 mb-1" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2.5 last:mb-0 text-slate-200" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5 text-slate-200" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5 text-slate-200" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-white" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a className="text-sky-400 hover:text-sky-300 underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => (
                          <code className="px-1.5 py-0.5 rounded bg-black/50 text-amber-200 font-mono text-[11.5px] border border-white/10" {...props}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Clean Grounded Citation Chips */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.08]">
                      <div className="text-xs font-medium text-slate-300 flex items-center justify-between gap-1.5 mb-2.5">
                        <span className="flex items-center gap-1.5 font-semibold text-amber-300/90">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          Sources & Citations ({msg.citations.length})
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Click to inspect
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => handleOpenCitation(cit, msg.citations)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/40 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer active:scale-95 group text-left"
                            title="Click to view full source text"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform shrink-0" />
                            <span className="font-medium truncate max-w-[170px] sm:max-w-[220px]">
                              {formatCitationPillTitle(cit, cIdx)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Smart Follow-up Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-white/[0.08]">
                      <div className="text-[11.5px] font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Suggested Follow-ups
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="text-left px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/30 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                          >
                            <CornerDownRight className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discrete Dev Telemetry Pill */}
                  <TelemetryBadge telemetry={msg.telemetry} />
                </div>

                {msg.role === "user" && (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-200 shrink-0 mt-1 shadow-sm">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 sm:gap-3.5 justify-start animate-in fade-in duration-200">
                <img 
                  src={dilipLogo} 
                  alt="Agent Loading" 
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 animate-pulse" 
                />
                <div className="bg-[#0b101f]/90 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-4.5 sm:py-3 border border-white/10 flex items-center gap-3 text-xs text-slate-200 shadow-sm font-sans">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">{thinkingStep}</span>
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
            className="p-3 sm:p-4 border-t border-white/10 bg-black/25 flex items-center gap-2 font-sans"
          >
            <div className="relative flex-1">
              <input
                id="rag-chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Dilip's projects, IEEE research, or enterprise data..."
                className="w-full bg-white/[0.05] border border-white/15 rounded-2xl px-4 py-3 sm:py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-amber-400/20 transition-all shadow-inner"
                disabled={isLoading}
              />
            </div>

            <button
              id="rag-chat-send-btn"
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 sm:px-5 py-3 sm:py-3.5 min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Slide-out Interactive Citation Inspector Drawer with Smooth Motion Animation */}
      <CitationDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
        allCitations={activeCitationsList}
        onSelectCitation={(cit) => setSelectedCitation(cit)}
      />
    </div>
  );
};
