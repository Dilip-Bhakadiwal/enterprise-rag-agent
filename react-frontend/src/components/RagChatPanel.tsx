import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ArrowUp,
  User, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  ExternalLink, 
  CornerDownRight,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  PlusCircle
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});

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

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleRateMessage = (msgId: string, rating: "up" | "down") => {
    setRatings((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === rating ? (undefined as any) : rating,
    }));
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "New conversation started. Ask me anything about Dilip's credentials, IEEE research, or query enterprise datasets (Confluence, Jira, GitHub, Slack, Gmail).",
        timestamp: "Just now",
        suggestions: [
          "What research has Dilip published with MoES funding?",
          "How is MarketPulse AI's LangGraph multi-agent pipeline designed?",
          "What is the recommended liability cap language in procurement SOPs?"
        ]
      }
    ]);
  };

  const handleOpenCitation = (citation: Citation, allInMsg?: Citation[]) => {
    setSelectedCitation(citation);
    setActiveCitationsList(allInMsg || [citation]);
  };

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
      
      {/* Glassmorphic Centered Window Container with Vanguard Sharp Aesthetics */}
      <div
        className={`relative z-10 w-full ${
          isExpanded ? "w-screen h-screen max-w-none max-h-none rounded-none border-0" : "max-w-3xl h-[88dvh] sm:h-[720px] max-h-[92dvh] rounded-md border border-white/10"
        } flex flex-col bg-[#090d16]/95 backdrop-blur-2xl text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 font-sans ${
          isLoading ? "ring-1 ring-[#FF9F1C]/50 shadow-[#FF9F1C]/15" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={dilipLogo} 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 border border-white/20 rounded-sm" 
            />
            <div>
              <h2 className="font-podium text-xl sm:text-2xl tracking-wide uppercase text-white">
                Enterprise RAG Assistant
              </h2>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-neutral-900 border border-white/20 hover:border-[#FF9F1C]/60 text-[10px] sm:text-xs font-inter tracking-widest uppercase text-white/90 hover:text-white transition-all cursor-pointer"
              title="Start a new chat session"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFD166]" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 sm:p-2.5 bg-black hover:bg-neutral-900 border border-white/20 hover:border-white/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? "Restore window size" : "Maximize to full screen"}
              aria-label="Maximize / Minimize"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            <button
              id="rag-panel-close-btn"
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-black hover:bg-red-900/30 border border-white/20 hover:border-red-500/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Window"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Window Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ios-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-up`}
              >
                {msg.role === "assistant" && (
                  <img 
                    src={dilipLogo} 
                    alt="Agent" 
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 mt-1 border border-white/20 rounded-sm" 
                  />
                )}

                <div
                  className={`leading-[1.75] font-inter transition-all ${
                    msg.role === "user"
                      ? "max-w-[85%] sm:max-w-[78%] rounded-sm px-5 py-4 text-sm bg-black/60 text-white border border-white/20 shadow-lg backdrop-blur-xl"
                      : "max-w-[92%] sm:max-w-[86%] rounded-sm p-5 sm:p-6 text-sm bg-black/40 text-white/90 border border-white/10 shadow-xl backdrop-blur-2xl"
                  }`}
                >
                  {/* Clean Markdown Response Body */}
                  <div className="text-sm leading-relaxed text-white/80 markdown-content select-text font-inter">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-base sm:text-lg font-podium tracking-wide text-white mt-4 mb-2 border-b border-white/10 pb-2 uppercase" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-sm sm:text-base font-inter font-bold text-white/90 mt-4 mb-2 tracking-tight" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-[13px] sm:text-sm font-inter font-semibold text-[#FFD166] mt-3 mb-1.5 uppercase tracking-wider" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-3 last:mb-0 text-white/80" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-white/80" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-white/80" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-white" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a className="text-[#00B4D8] hover:text-[#00B4D8]/80 underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => (
                          <code className="px-2 py-0.5 rounded-full bg-black/60 text-[#FFD166] font-mono text-[11.5px] border border-white/10" {...props}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Clean Grounded Citation Chips with Vanguard Style */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="font-inter text-[10px] tracking-widest uppercase text-white/50 flex items-center justify-between gap-2 mb-3">
                        <span className="flex items-center gap-2 font-semibold text-[#FFD166]">
                          <FileText className="w-3.5 h-3.5 text-[#FF9F1C]" />
                          SOURCES & CITATIONS ({msg.citations.length})
                        </span>
                        <span className="text-[9px] text-white/40">
                          CLICK TO INSPECT
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {msg.citations.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => handleOpenCitation(cit, msg.citations)}
                            className="px-4 py-2 rounded-sm bg-black/50 hover:bg-neutral-900 border border-white/20 hover:border-[#FF9F1C]/60 text-[10px] font-inter tracking-widest uppercase text-white/80 hover:text-white transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 group text-left shadow-sm"
                            title="Click to view full source text"
                          >
                            <span className="w-1 h-1 bg-[#FF9F1C] group-hover:scale-150 transition-transform shrink-0" />
                            <span className="truncate max-w-[170px] sm:max-w-[220px]">
                              {formatCitationPillTitle(cit, cIdx)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#FFD166] shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Smart Follow-up Suggestions with Vanguard Style */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="font-inter text-[10px] tracking-widest uppercase font-semibold text-white/50 flex items-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF9F1C]" />
                        SUGGESTED FOLLOW-UPS
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="text-left px-4 py-2.5 rounded-sm bg-black/40 hover:bg-neutral-900 border border-white/20 hover:border-[#FF9F1C]/60 text-[10px] font-inter tracking-widest uppercase text-white/80 hover:text-white transition-all flex items-center gap-2.5 active:scale-[0.98] cursor-pointer shadow-sm"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-[#FFD166] shrink-0" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Toolbar */}
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-inter tracking-widest uppercase text-white/40">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="px-3 py-1.5 rounded-sm hover:bg-white/10 hover:text-white/80 transition-colors flex items-center gap-2 cursor-pointer"
                          title="Copy response to clipboard"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#FFD166]" />
                              <span className="text-[#FFD166]">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleRegenerate}
                          className="px-3 py-1.5 rounded-sm hover:bg-white/10 hover:text-white/80 transition-colors flex items-center gap-2 cursor-pointer"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>RETRY</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRateMessage(msg.id, "up")}
                          className={`p-2 rounded-sm transition-colors cursor-pointer border ${
                            ratings[msg.id] === "up"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "border-transparent hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white/80"
                          }`}
                          title="Helpful response"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRateMessage(msg.id, "down")}
                          className={`p-2 rounded-sm transition-colors cursor-pointer border ${
                            ratings[msg.id] === "down"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "border-transparent hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white/80"
                          }`}
                          title="Unhelpful response"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Discrete Dev Telemetry Pill */}
                  <TelemetryBadge telemetry={msg.telemetry} />
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-black border border-white/20 flex items-center justify-center text-[#FFD166] shrink-0 mt-1 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 sm:gap-4 justify-start animate-fade-up">
                <img 
                  src={dilipLogo} 
                  alt="Agent Loading" 
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 animate-pulse border border-white/20 rounded-sm mt-1" 
                />
                <div className="bg-black/40 backdrop-blur-xl rounded-sm px-5 py-3 sm:px-6 sm:py-4 border border-white/10 flex items-center gap-3 font-inter shadow-md">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F1C] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E67E22] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[10px] tracking-widest uppercase text-white/50">{thinkingStep}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Vanguard Style Sharp Input Container */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 sm:p-6 border-t border-white/10 bg-black/60 flex items-center font-inter"
          >
            <div className="relative flex items-center w-full bg-black/40 hover:bg-black/60 focus-within:bg-black/80 focus-within:ring-1 focus-within:ring-[#FF9F1C]/40 border border-white/20 focus-within:border-[#FF9F1C]/60 rounded-sm transition-all shadow-lg backdrop-blur-md px-2 py-1.5">
              <input
                id="rag-chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="ASK ABOUT DILIP'S PROJECTS OR ENTERPRISE DATA..."
                className="w-full bg-transparent border-0 pl-4 pr-16 py-3 sm:py-3.5 text-xs sm:text-sm tracking-widest text-white placeholder-white/30 focus:outline-none uppercase font-inter"
                disabled={isLoading}
              />

              {/* Aesthetic Action Send Icon */}
              <button
                id="rag-chat-send-btn"
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`absolute right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-sm flex items-center justify-center transition-all cursor-pointer ${
                  inputValue.trim()
                    ? "bg-[#FF9F1C] text-black hover:bg-[#FFD166] shadow-md shadow-[#FF9F1C]/25 active:scale-95"
                    : "text-white/30 bg-white/5 hover:text-white/50 cursor-not-allowed"
                }`}
                aria-label="Send query"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
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
