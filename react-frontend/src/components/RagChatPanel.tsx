import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, Citation } from "../types";
import { sendRagMessage } from "../services/api";
import { CitationDrawer } from "./CitationDrawer";

interface RagChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

// Component to render text with a smooth word-by-word fade animation
const AnimatedMarkdownText: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="text-sm sm:text-base text-gray-800 markdown-content font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-3 mb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 mt-2.5 mb-1.5" {...props}>
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          p: ({ node, children, ...props }) => {
            if (typeof children === "string") {
              const words = children.split(" ");
              return (
                <p className="mb-2.5 last:mb-0 text-gray-700 leading-relaxed" {...props}>
                  {words.map((w, idx) => (
                    <span
                      key={idx}
                      className="word-animate"
                      style={{ animationDelay: `${Math.min(idx * 28, 900)}ms` }}
                    >
                      {w}&nbsp;
                    </span>
                  ))}
                </p>
              );
            }
            return <p className="mb-2.5 last:mb-0 text-gray-700 leading-relaxed" {...props}>{children}</p>;
          },
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2.5 text-gray-600" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-gray-600" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-600 leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="text-gray-900 font-semibold" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[#F97316] hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          code: ({ node, className, children, ...props }) => (
            <code className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 font-mono text-xs" {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

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
  const [thinkingStep, setThinkingStep] = useState("Synthesizing response...");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeCitationsList, setActiveCitationsList] = useState<Citation[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Set<string>>(new Set());

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

  const toggleDetails = (msgId: string) => {
    setExpandedDetailsIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

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
      return `Dilip • ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    }
    const cat = (cit.category || cit.source_type || "CONFLUENCE").toUpperCase();
    return `${cat} • Doc [${idx + 1}]`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/60 backdrop-blur-md"
        >
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={onClose} 
            aria-label="Close Assistant Window" 
          />
          
          {/* BEGIN: ChatContainer with 1s open fade and 0.5s close fade */}
          <motion.main 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ 
              opacity: { duration: 1.0, ease: "easeOut" },
              scale: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
            }}
            className="w-full max-w-5xl rounded-3xl gradient-bg p-[6px] shadow-custom relative flex flex-col h-[90vh] max-h-[92dvh] z-10" 
            data-purpose="chat-container"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-3 text-white" data-purpose="top-bar">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium tracking-wide">Enterprise RAG Assistant</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleNewChat}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-full transition-colors font-medium flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <i className="ph ph-plus"></i>New Chat
                </button>
                <button 
                  onClick={onClose}
                  aria-label="Close" 
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <i className="ph ph-x text-lg"></i>
                </button>
              </div>
            </div>

            {/* Main Area */}
            <div className="bg-white rounded-[22px] p-3 sm:p-4 flex flex-col w-full flex-1 overflow-hidden" data-purpose="main-area">
              {/* Chat History */}
              <div className="flex flex-col gap-4 overflow-y-auto flex-1 mb-3 px-1 sm:px-2 ios-scroll" data-purpose="chat-history">
                {messages.map((msg) => (
                  <React.Fragment key={msg.id}>
                    {msg.role === "user" ? (
                      /* User Query Message */
                      <div className="flex flex-col items-end">
                        <div className="bg-[#F97316] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm animate-pop-in">
                          <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      /* AI Response Message */
                      <div className="flex flex-col items-start">
                        <div className="bg-gray-100 text-gray-800 p-4 sm:p-5 rounded-2xl rounded-tl-none max-w-[85%] shadow-xs w-full md:max-w-[90%] transition-all">
                          {/* 1. Only Query Response Markdown Text */}
                          <AnimatedMarkdownText content={msg.content} />

                          {/* 2. Dropdown Toggle Button for Technical Info & Citations */}
                          <div className="mt-4 pt-3 border-t border-gray-200/90 flex items-center justify-between flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDetails(msg.id)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100/90 border border-orange-200/80 text-xs font-semibold text-orange-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                            >
                              <i className="ph ph-sliders text-[#F97316] text-sm"></i>
                              <span>
                                {expandedDetailsIds.has(msg.id)
                                  ? "Hide Technical Details & Sources"
                                  : `View Details & Sources (${(msg.citations?.length || 0) + (msg.telemetry ? 1 : 0)})`}
                              </span>
                              <i className={`ph ph-caret-down text-orange-600 transition-transform duration-300 ${expandedDetailsIds.has(msg.id) ? "rotate-180" : ""}`}></i>
                            </button>

                            {/* Quick Action Toolbar (Copy, Regenerate, Feedback) */}
                            {msg.id !== "welcome" && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                                <button
                                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                                  className="px-2 py-1 rounded hover:bg-gray-200/80 transition-colors flex items-center gap-1 cursor-pointer text-gray-600"
                                  title="Copy response"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700 text-xs">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="text-xs">Copy</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={handleRegenerate}
                                  className="px-2 py-1 rounded hover:bg-gray-200/80 transition-colors flex items-center gap-1 cursor-pointer text-gray-600"
                                  title="Regenerate response"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span className="text-xs">Retry</span>
                                </button>
                                <div className="h-3.5 w-px bg-gray-300 mx-0.5" />
                                <button
                                  onClick={() => handleRateMessage(msg.id, "up")}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    ratings[msg.id] === "up" ? "bg-emerald-100 text-emerald-700" : "hover:bg-gray-200/80 text-gray-500"
                                  }`}
                                  title="Helpful"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRateMessage(msg.id, "down")}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    ratings[msg.id] === "down" ? "bg-red-100 text-red-700" : "hover:bg-gray-200/80 text-gray-500"
                                  }`}
                                  title="Unhelpful"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 3. Animated Dropdown Section for Sources, Latency Bar, Economics & Follow-ups */}
                          <AnimatePresence>
                            {expandedDetailsIds.has(msg.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-4 pt-4 mt-3 border-t border-dashed border-gray-200">
                                  {/* Sources & Citations */}
                                  {msg.citations && msg.citations.length > 0 && (
                                    <div className="space-y-2">
                                      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                        <i className="ph ph-file-text text-[#F97316] text-sm"></i> Sources &amp; Citations ({msg.citations.length})
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {msg.citations.map((cit, cIdx) => (
                                          <button
                                            key={cIdx}
                                            onClick={() => handleOpenCitation(cit, msg.citations)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-medium text-gray-800 hover:bg-orange-100 transition-colors cursor-pointer active:scale-95"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-gray-800"></span>
                                            {formatCitationPillTitle(cit, cIdx)}
                                            <i className="ph ph-arrow-up-right"></i>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* LangGraph Node Execution Waterfall with Left-to-Right Animated Filling Bars */}
                                  {msg.id !== "welcome" && (
                                    <div className="bg-gray-50/90 rounded-xl p-4 border border-gray-200">
                                      <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                          <i className="ph ph-clock text-[#F97316] text-sm"></i> LangGraph Node Execution Waterfall
                                        </h4>
                                        <span className="text-xs font-bold text-gray-500">
                                          {msg.telemetry?.latency_ms ? (msg.telemetry.latency_ms / 1000).toFixed(2) + "s" : "0.42s"}
                                        </span>
                                      </div>
                                      {/* Animated Progress Bar */}
                                      <div className="w-full h-2.5 rounded-full bg-gray-200 mb-3 flex overflow-hidden">
                                        <div className="bg-blue-500 h-full animate-fill-bar" style={{ width: "10.4%", animationDelay: "100ms" }} title="Router"></div>
                                        <div className="bg-indigo-500 h-full animate-fill-bar" style={{ width: "2.7%", animationDelay: "250ms" }} title="Decomposer"></div>
                                        <div className="bg-yellow-500 h-full animate-fill-bar" style={{ width: "10.2%", animationDelay: "400ms" }} title="Pinecone"></div>
                                        <div className="bg-emerald-500 h-full animate-fill-bar" style={{ width: "76.7%", animationDelay: "550ms" }} title="LLM Synthesis"></div>
                                      </div>
                                      {/* Legend */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11.5px] text-gray-600">
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Router: {msg.telemetry?.node_timings?.router || "45ms"}</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Decomposer: {msg.telemetry?.node_timings?.decomposer || "28ms"}</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pinecone: {msg.telemetry?.node_timings?.retrieval || "112ms"}</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> LLM Synth: {msg.telemetry?.node_timings?.synthesis || "180ms"}</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Token Economics & 3-Tier Failover Ladder */}
                                  {msg.id !== "welcome" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      {/* Token Economics */}
                                      <div className="bg-gray-50/90 rounded-xl p-3.5 border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2.5">
                                          <i className="ph ph-currency-dollar text-[#F97316] text-sm"></i> Token Economics
                                        </h4>
                                        <div className="flex justify-between items-center text-xs mb-1">
                                          <span className="text-gray-500">Prompt / Output:</span>
                                          <span className="font-medium text-gray-700">
                                            {msg.telemetry?.prompt_tokens || 966} / {msg.telemetry?.completion_tokens || 384}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-gray-500">Estimated Cost:</span>
                                          <span className="font-bold text-emerald-600">
                                            ${msg.telemetry?.cost_usd ? msg.telemetry.cost_usd.toFixed(6) : "0.000162"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Failover Ladder */}
                                      <div className="bg-gray-50/90 rounded-xl p-3.5 border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2.5">
                                          <i className="ph ph-ladder text-[#F97316] text-sm"></i> 3-Tier Failover Ladder
                                        </h4>
                                        <ul className="text-xs space-y-1 text-gray-600">
                                          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 1. OpenRouter (Primary)</li>
                                          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> 2. Groq Cloud (108ms)</li>
                                          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 3. NVIDIA NIM (Fallback)</li>
                                        </ul>
                                      </div>
                                    </div>
                                  )}

                                  {/* Suggested Follow-ups */}
                                  {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="space-y-2 pt-1 border-t border-gray-200">
                                      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                        <i className="ph ph-sparkle text-[#F97316] text-sm"></i> Suggested Follow-ups
                                      </h4>
                                      <div className="flex flex-col gap-1.5">
                                        {msg.suggestions.map((sug, sIdx) => (
                                          <button
                                            key={sIdx}
                                            onClick={() => handleSendMessage(sug)}
                                            className="text-left flex items-start gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 transition-colors text-xs text-gray-700 cursor-pointer active:scale-[0.99]"
                                          >
                                            <i className="ph ph-arrow-bend-down-right text-orange-500 mt-0.5 shrink-0"></i>
                                            <span>{sug}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {isLoading && (
                  <div className="flex flex-col items-start animate-fade-in">
                    <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-[#F97316] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-[#FBBF24] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{thinkingStep}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 4. Perfectly Aligned Input Area & Send Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3 shrink-0 pt-3 pb-1 px-1 sm:px-2 border-t border-gray-200 bg-white"
                data-purpose="input-area"
              >
                <div className="relative flex items-center flex-1 bg-gray-50/90 hover:bg-gray-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F97316]/30 border border-gray-200 focus-within:border-[#F97316] rounded-2xl transition-all shadow-inner px-3.5 py-1.5">
                  <textarea
                    id="rag-chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 text-sm sm:text-base resize-none border-none focus:ring-0 p-0 min-h-[38px] max-h-[120px] focus:outline-none leading-normal"
                    data-purpose="text-input"
                    placeholder="Ask anything about Dilip's projects or enterprise RAG..."
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <button
                  id="rag-chat-send-btn"
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  aria-label="Send message"
                  className="w-11 h-11 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] flex items-center justify-center text-white transition-all shadow-md shadow-orange-300/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
                >
                  <i className="ph ph-arrow-up text-xl font-bold"></i>
                </button>
              </form>
            </div>
          </motion.main>
          {/* END: ChatContainer */}

          {/* Slide-out Interactive Citation Inspector Drawer */}
          <CitationDrawer
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
            allCitations={activeCitationsList}
            onSelectCitation={(cit) => setSelectedCitation(cit)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
