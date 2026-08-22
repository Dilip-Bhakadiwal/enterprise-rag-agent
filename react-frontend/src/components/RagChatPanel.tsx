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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-podium text-lg sm:text-xl tracking-wide uppercase text-white">Enterprise RAG Assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewChat}
              className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-sm transition-colors font-inter tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-sm text-white"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFD166]" />
              New Chat
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors cursor-pointer p-2 hover:bg-white/5 rounded-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Window Body */}
        <div className="flex flex-col w-full flex-1 overflow-hidden bg-transparent">
          <div className="flex flex-col gap-5 overflow-y-auto flex-1 mb-4 p-4 sm:p-6 ios-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } animate-fade-up`}
              >
                <div
                  className={`${
                    msg.role === "user"
                      ? "bg-[#FF9F1C] text-black p-4 rounded-sm max-w-[85%] shadow-sm"
                      : "bg-black/60 text-white/90 p-5 sm:p-6 rounded-sm w-full md:max-w-[90%] border border-white/20 shadow-[0_0_30px_rgba(255,159,28,0.1)] backdrop-blur-xl"
                  }`}
                >
                  {/* Clean Markdown Response Body */}
                  <div className={`text-sm sm:text-base leading-relaxed ${msg.role === 'user' ? 'text-black font-medium' : 'text-white/80'} markdown-content select-text font-inter`}>
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

                  {/* Technical Details Summary (Using suggestions or telemetry as proxy if available, else static) */}
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <div className="space-y-6 mt-6 pt-6 border-t border-white/10">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Token Economics */}
                        <div className="bg-black/40 rounded-sm p-4 border border-white/20">
                          <h4 className="text-[10px] font-inter tracking-widest uppercase font-semibold text-white/60 flex items-center gap-2 mb-3">
                            <FileText className="w-3.5 h-3.5 text-[#FF9F1C]" /> Token Economics
                          </h4>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-white/50">Prompt / Output:</span>
                            <span className="font-medium text-white/90">966 / 384</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/50">Estimated Cost:</span>
                            <span className="font-bold text-[#FFD166]">$0.000162</span>
                          </div>
                        </div>

                        {/* Failover Ladder */}
                        <div className="bg-black/40 rounded-sm p-4 border border-white/20">
                          <h4 className="text-[10px] font-inter tracking-widest uppercase font-semibold text-white/60 flex items-center gap-2 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-[#FF9F1C]" /> 3-Tier Failover
                          </h4>
                          <ul className="text-[10px] font-inter tracking-widest uppercase space-y-2 text-white/70">
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FFD166]"></span> 1. OpenRouter (Primary)</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF9F1C]"></span> 2. Groq Cloud (108ms)</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-cyan-500"></span> 3. NVIDIA NIM (Fallback)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clean Grounded Citation Chips with Vanguard Style */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                      <h4 className="text-[10px] font-inter tracking-widest uppercase font-semibold text-white/60 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#FF9F1C]" />
                        SOURCES & CITATIONS ({msg.citations.length})
                      </h4>

                      <div className="flex flex-wrap gap-2.5">
                        {msg.citations.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => handleOpenCitation(cit, msg.citations)}
                            className="px-4 py-2 rounded-sm bg-[#FF9F1C]/10 border border-[#FF9F1C]/30 text-[10px] font-inter tracking-widest uppercase text-white/90 hover:bg-[#FF9F1C]/20 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                            title="Click to view full source text"
                          >
                            <span className="w-1.5 h-1.5 bg-[#FF9F1C] shrink-0" />
                            <span className="truncate max-w-[170px] sm:max-w-[220px]">
                              {formatCitationPillTitle(cit, cIdx)}
                            </span>
                            <ExternalLink className="w-3 h-3 text-[#FFD166] shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Smart Follow-up Suggestions with Vanguard Style */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="space-y-3 mt-6 pt-5 border-t border-white/10">
                      <h4 className="text-[10px] font-inter tracking-widest uppercase font-semibold text-white/60 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF9F1C]" />
                        SUGGESTED FOLLOW-UPS
                      </h4>
                      <div className="flex flex-col gap-2.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sug)}
                            className="text-left flex items-start gap-3 p-3 sm:p-4 rounded-sm border border-white/20 bg-black/40 hover:border-[#FF9F1C]/60 hover:bg-black/60 transition-colors text-xs sm:text-sm font-inter text-white/90 shadow-sm"
                          >
                            <CornerDownRight className="w-4 h-4 text-[#FF9F1C] mt-0.5 shrink-0" />
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
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start animate-fade-up">
                <div className="bg-black/60 text-white/90 p-5 sm:p-6 rounded-sm w-full md:max-w-[90%] border border-white/20 shadow-md backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF9F1C] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#E67E22] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[#FFD166] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] tracking-widest uppercase font-inter text-white/50">{thinkingStep}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area matching template */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-4 shrink-0 pt-4 pb-2 px-4 sm:px-6 border-t border-white/10 bg-black/60"
          >
            {/* Text Input */}
            <textarea
              id="rag-chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent text-white placeholder-white/30 text-base sm:text-lg resize-none border-none focus:ring-0 p-0 sm:px-2 min-h-[44px] font-inter focus:outline-none uppercase"
              placeholder="ASK ANYTHING..."
              rows={1}
              disabled={isLoading}
            />
            {/* Bottom Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 ml-auto">
                <button
                  id="rag-chat-send-btn"
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,159,28,0.2)] ${
                    inputValue.trim()
                      ? "bg-[#FF9F1C] hover:bg-[#E67E22] text-black cursor-pointer active:scale-95"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
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
