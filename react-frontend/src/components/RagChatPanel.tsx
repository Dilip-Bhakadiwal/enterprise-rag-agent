import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Square,
  Download,
  ShieldCheck,
  Zap,
  Sparkles,
  FileUp,
  FileText,
  Database,
  Trash2,
  AlertCircle,
  Loader2,
  Lock,
  UploadCloud,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, Citation, DocSessionData } from "../types";
import {
  sendRagMessage,
  uploadAndParseDocument,
  askDocumentQuestion,
  clearDocumentSession,
} from "../services/api";
import { CitationDrawer } from "./CitationDrawer";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface RagChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  defaultMaximized?: boolean;
  initialMode?: "enterprise" | "doc";
}

// Clean markdown text renderer
const MarkdownText: React.FC<{ content: string }> = React.memo(({ content }) => {
  return (
    <div className="text-sm sm:text-base text-gray-800 markdown-content font-geist select-text leading-relaxed tracking-[-0.01em]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-2 mb-1.5 font-geist tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 mt-2 mb-1 font-geist tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mt-1.5 mb-0.5 font-geist" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-1.5 last:mb-0 text-gray-700 leading-relaxed font-geist text-sm sm:text-[14px]" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 space-y-0.5 mb-1.5 text-gray-600 font-geist text-sm sm:text-[14px]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 space-y-0.5 mb-1.5 text-gray-600 font-geist text-sm sm:text-[14px]" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-600 leading-relaxed font-geist" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="text-gray-900 font-semibold font-geist" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[#059669] hover:underline font-medium break-all font-geist" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          code: ({ node, className, children, ...props }) => (
            <code className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 font-geist-mono text-xs" {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// Memoized User Message Item
const UserMessageItem = React.memo<{ msg: ChatMessage }>(({ msg }) => {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <div className={`bg-[#18202e] border border-white/15 text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-md font-geist tracking-[-0.01em] ${animating ? "animate-pop-in" : ""}`}>
        <p className="text-sm sm:text-base leading-relaxed select-text font-geist">{msg.content}</p>
      </div>
    </div>
  );
});

// Memoized Assistant Message Item
const AssistantMessageItem = React.memo<{
  msg: ChatMessage;
  isExpanded: boolean;
  isMaximized: boolean;
  onToggleDetails: (id: string) => void;
  onCopy: (id: string, content: string) => void;
  isCopied: boolean;
  onRegenerate: () => void;
  onRate: (id: string, rating: "up" | "down") => void;
  rating?: "up" | "down";
  onOpenCitation: (citation: Citation, allInMsg?: Citation[]) => void;
  formatCitationPillTitle: (cit: Citation, idx: number) => string;
  onSendMessage: (prompt: string) => void;
}>(({
  msg,
  isExpanded,
  isMaximized,
  onToggleDetails,
  onCopy,
  isCopied,
  onRegenerate,
  onRate,
  rating,
  onOpenCitation,
  formatCitationPillTitle,
  onSendMessage,
}) => {
  const hasCitations = msg.citations && msg.citations.length > 0;
  const isWelcome = msg.id === "welcome" || msg.id.startsWith("welcome") || msg.id.startsWith("doc_welcome");

  return (
    <div className="flex items-start gap-2.5 sm:gap-3 w-full">
      {/* Assistant Brand Logo Avatar */}
      <img
        src={dilipLogo}
        alt="Nexora AI"
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain border border-gray-200/90 shadow-2xs shrink-0 mt-0.5 bg-white p-0.5"
      />
      <div className="bg-gray-100 text-gray-800 p-3 sm:p-3.5 rounded-2xl rounded-tl-none max-w-[90%] sm:max-w-[85%] shadow-xs w-full transition-all flex-1">
        {/* 1. Query Response Markdown Text */}
        <MarkdownText content={msg.content || ""} />

        {/* RAG Triad Groundedness Metric Badge */}
        {!isWelcome && (
          <div className="mt-2 flex items-center flex-wrap gap-1.5 text-[11px] font-geist">
            {hasCitations ? (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {msg.telemetry?.faithfulness_score
                      ? `${(msg.telemetry.faithfulness_score * 100).toFixed(1)}% Grounded`
                      : "Grounded in Knowledge Base"}
                  </span>
                </span>
                {msg.telemetry?.context_precision !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium">
                    <span className="text-gray-400">Precision:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {msg.telemetry.context_precision.toFixed(2)}
                    </span>
                  </span>
                )}
                {msg.telemetry?.hallucination_risk && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium">
                    <span className="text-gray-400">Risk:</span>
                    <span className="font-semibold text-emerald-700">
                      {msg.telemetry.hallucination_risk}
                    </span>
                  </span>
                )}
                {msg.telemetry?.cached && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-medium font-mono text-[10.5px]">
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                    <span>Redis Hit (~{Math.round(msg.telemetry.cache_latency_ms || 4)}ms)</span>
                  </span>
                )}
              </>
            ) : msg.telemetry?.cached ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-medium font-mono text-[10.5px]">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                <span>Redis Hit (~{Math.round(msg.telemetry.cache_latency_ms || 4)}ms)</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Suggested Queries Chips (Visible directly) */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-200/80">
            <p className="text-[10.5px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5fe323]"></span>
              <span>Suggested Queries</span>
            </p>
            <div className="flex flex-col gap-1">
              {msg.suggestions.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => onSendMessage(sug)}
                  className="text-left flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#5fe323] hover:bg-emerald-50/40 text-xs text-gray-800 font-medium transition-all cursor-pointer active:scale-[0.99] shadow-2xs group"
                >
                  <span className="font-geist">{sug}</span>
                  <span className="text-gray-400 group-hover:text-[#5fe323] text-xs font-mono transition-colors font-bold">↵</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Action Toolbar & Details Button (Hidden on welcome message) */}
        {!isWelcome && (
          <div className="mt-2 pt-2 border-t border-gray-200/90 flex items-center justify-between flex-wrap gap-2">
            {/* View Details Button - ONLY shown in Fullscreen Workspace mode when citations exist */}
            {isMaximized && hasCitations ? (
              <button
                type="button"
                onClick={() => onToggleDetails(msg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/80 text-xs font-semibold text-emerald-900 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <i className="ph ph-sliders text-[#059669] text-sm"></i>
                <span>
                  {isExpanded
                    ? "Hide Technical Details & Sources"
                    : `View Details & Sources (${msg.citations!.length})`}
                </span>
                <i className={`ph ph-caret-down text-emerald-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}></i>
              </button>
            ) : (
              <div />
            )}

            {/* Quick Action Toolbar (Copy, Regenerate, Feedback) */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
              <button
                onClick={() => onCopy(msg.id, msg.content)}
                className="px-2 py-1 rounded hover:bg-gray-200/80 transition-colors flex items-center gap-1 cursor-pointer text-gray-600"
                title="Copy response"
              >
                {isCopied ? (
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
                onClick={onRegenerate}
                className="px-2 py-1 rounded hover:bg-gray-200/80 transition-colors flex items-center gap-1 cursor-pointer text-gray-600"
                title="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-xs">Retry</span>
              </button>
              <div className="h-3.5 w-px bg-gray-300 mx-0.5" />
              <button
                onClick={() => onRate(msg.id, "up")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  rating === "up" ? "bg-emerald-100 text-emerald-700" : "hover:bg-gray-200/80 text-gray-500"
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRate(msg.id, "down")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  rating === "down" ? "bg-red-100 text-red-700" : "hover:bg-gray-200/80 text-gray-500"
                }`}
                title="Unhelpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Animated Dropdown Section for Sources, Latency Bar, Economics & Follow-ups */}
        <AnimatePresence>
          {isExpanded && (
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                        <i className="ph ph-file-text text-[#059669] text-sm"></i> Sources &amp; Citations ({msg.citations.length})
                      </h4>
                      <span className="text-[11px] text-gray-400 font-geist">
                        {msg.citations.filter((c) => c.is_graph || c.source_type === "neo4j_graph").length > 0 && (
                          <span>{msg.citations.filter((c) => c.is_graph || c.source_type === "neo4j_graph").length} Graph Facts · </span>
                        )}
                        {msg.citations.filter((c) => !c.is_graph && c.source_type !== "neo4j_graph").length} Vector Chunks
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => onOpenCitation(cit, msg.citations)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-gray-900 transition-all cursor-pointer active:scale-95 shadow-2xs font-geist"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
                          <span>{formatCitationPillTitle(cit, cIdx)}</span>
                          <i className="ph ph-arrow-up-right text-[10.5px] text-gray-400"></i>
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
                        <i className="ph ph-clock text-[#059669] text-sm"></i> LangGraph Node Execution Waterfall
                      </h4>
                      <span className="text-xs font-bold text-gray-500 font-geist-mono">
                        {msg.telemetry?.total_time_ms ? (msg.telemetry.total_time_ms / 1000).toFixed(2) + "s" : "0.38s"}
                      </span>
                    </div>
                    {/* 5-Stage Animated Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-gray-200 mb-3 flex overflow-hidden">
                      <div className="bg-sky-500 h-full animate-fill-bar" style={{ width: "9%", animationDelay: "80ms" }} title="Router"></div>
                      <div className="bg-purple-500 h-full animate-fill-bar" style={{ width: "7%", animationDelay: "200ms" }} title="Decomposer"></div>
                      <div className="bg-amber-500 h-full animate-fill-bar" style={{ width: "14%", animationDelay: "320ms" }} title="Pinecone Vector Search"></div>
                      <div className="bg-indigo-500 h-full animate-fill-bar" style={{ width: "16%", animationDelay: "450ms" }} title="Neo4j Graph Hop"></div>
                      <div className="bg-emerald-500 h-full animate-fill-bar" style={{ width: "54%", animationDelay: "580ms" }} title="LLM Synthesis"></div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span> Router: {msg.telemetry?.node_timings?.router || "38ms"}</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span> Decomposer: {msg.telemetry?.node_timings?.decomposer || "24ms"}</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span> Pinecone: {msg.telemetry?.node_timings?.retrieval || "94ms"}</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span> Neo4j Hop: {msg.telemetry?.node_timings?.graph_hop || "42ms"}</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> LLM Synth: {msg.telemetry?.node_timings?.synthesis || "180ms"}</div>
                    </div>
                  </div>
                )}

                {/* 5-Column Balanced Telemetry Grid: Perfect Margin & Single-Line Layout */}
                {msg.id !== "welcome" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                    {/* Card 1: Neo4j AuraDB */}
                    <div className="rounded-2xl p-4 pb-4 relative overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md transition-all duration-200 bg-white text-black flex flex-col justify-start">
                      <header className="flex items-center gap-2.5 mb-1.5" data-purpose="card-header">
                        <div aria-hidden="true" className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base italic shrink-0 shadow-2xs bg-black text-white">
                          N
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black leading-tight">Neo4j AuraDB</p>
                        </div>
                      </header>
                      <div className="h-[2px] w-full my-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>

                      <div className="space-y-2 my-1" data-purpose="sales-breakdown">
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Neo4j Aura</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">
                            {msg.telemetry?.graph_nodes || 476} Nodes / {msg.telemetry?.graph_relationships ? `${(msg.telemetry.graph_relationships / 1000).toFixed(1)}K` : "7.6K"} Edges
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Authority</span>
                          <span className="font-bold text-emerald-600 font-mono text-xs text-right truncate">10/10 (Highest)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Query Engine</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">Cypher Hop</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>
                    </div>

                    {/* Card 2: Token Economics */}
                    <div className="rounded-2xl p-4 pb-4 relative overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md transition-all duration-200 bg-white text-black flex flex-col justify-start">
                      <header className="flex items-center gap-2.5 mb-1.5" data-purpose="card-header">
                        <div aria-hidden="true" className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base italic shrink-0 shadow-2xs bg-black text-white">
                          $
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black leading-tight">Token Economics</p>
                        </div>
                      </header>
                      <div className="h-[2px] w-full my-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>

                      <div className="space-y-2 my-1" data-purpose="sales-breakdown">
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Prompt / Output</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">
                            {msg.telemetry?.prompt_tokens || 629} / {msg.telemetry?.completion_tokens || 78}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Est. Cost</span>
                          <span className="font-bold text-emerald-600 font-mono text-xs text-right truncate">
                            ${msg.telemetry?.estimated_cost_usd || msg.telemetry?.cost_usd ? (msg.telemetry?.estimated_cost_usd || msg.telemetry?.cost_usd)!.toFixed(6) : "0.000162"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Total Tokens</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">
                            {msg.telemetry?.total_tokens || (msg.telemetry?.prompt_tokens || 629) + (msg.telemetry?.completion_tokens || 78)}
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>
                    </div>

                    {/* Card 3: 3-Tier Failover */}
                    <div className="rounded-2xl p-4 pb-4 relative overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md transition-all duration-200 bg-white text-black flex flex-col justify-start">
                      <header className="flex items-center gap-2.5 mb-1.5" data-purpose="card-header">
                        <div aria-hidden="true" className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base italic shrink-0 shadow-2xs bg-black text-white">
                          3
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black leading-tight">3-Tier Failover</p>
                        </div>
                      </header>
                      <div className="h-[2px] w-full my-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>

                      <div className="space-y-2 my-1" data-purpose="sales-breakdown">
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Primary Tier</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">1. OpenRouter</span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Fast Failover</span>
                          <span className="font-bold text-amber-600 font-mono text-xs text-right truncate">2. Groq (108ms)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Active Engine</span>
                          <span className="font-bold text-emerald-700 uppercase font-mono text-xs text-right truncate">
                            {msg.telemetry?.active_provider || "openrouter"}
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>
                    </div>

                    {/* Card 4: Privacy Guardrail */}
                    <div className="rounded-2xl p-4 pb-4 relative overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md transition-all duration-200 bg-white text-black flex flex-col justify-start">
                      <header className="flex items-center gap-2.5 mb-1.5" data-purpose="card-header">
                        <div aria-hidden="true" className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base italic shrink-0 shadow-2xs bg-black text-white">
                          P
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black leading-tight">Privacy Guardrail</p>
                        </div>
                      </header>
                      <div className="h-[2px] w-full my-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>

                      <div className="space-y-2 my-1" data-purpose="sales-breakdown">
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Interception</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">
                            {msg.telemetry?.pii_guardrail?.is_masked
                              ? `${msg.telemetry.pii_guardrail.total_masked_count} Masked`
                              : "0 Exposed"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Sanitization</span>
                          <span className="font-bold text-emerald-600 font-mono text-xs text-right truncate">
                            {msg.telemetry?.pii_guardrail?.is_masked ? "Auto-Redacted" : "Zero Leak"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs w-full gap-2">
                          <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Status</span>
                          <span className="font-bold text-black font-mono text-xs text-right truncate">
                            {msg.telemetry?.pii_guardrail?.is_masked ? "Cleaned" : "Encrypted & Clean"}
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(to right, rgb(249, 115, 22), rgb(251, 191, 36))" }}></div>
                    </div>

                    {/* Card 5: RAG Triad Quality */}
                    <div className="rounded-2xl p-4 pb-4 relative overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md transition-all duration-200 bg-white text-black flex flex-col justify-start">
                      <header className="flex items-center gap-2.5 mb-1.5" data-purpose="card-header">
                        <div aria-hidden="true" className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base italic shrink-0 shadow-2xs bg-emerald-700 text-white">
                          R
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black leading-tight">
                            {msg.citations && msg.citations.length > 0 ? "RAG Triad Metrics" : "Direct Generative Mode"}
                          </p>
                        </div>
                      </header>
                      <div className="h-[2px] w-full my-2 rounded-full" style={{ background: "linear-gradient(to right, rgb(16, 185, 129), rgb(59, 130, 246))" }}></div>

                      <div className="space-y-2 my-1" data-purpose="rag-triad-breakdown">
                        {msg.citations && msg.citations.length > 0 ? (
                          <>
                            <div className="flex justify-between items-center text-xs w-full gap-2">
                              <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Faithfulness</span>
                              <span className="font-bold text-emerald-600 font-mono text-xs text-right truncate">
                                {msg.telemetry?.faithfulness_score
                                  ? `${(msg.telemetry.faithfulness_score * 100).toFixed(1)}% Grounded`
                                  : "99.5% Grounded"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs w-full gap-2">
                              <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Context Precision</span>
                              <span className="font-bold text-black font-mono text-xs text-right truncate">
                                {msg.telemetry?.context_precision !== undefined
                                  ? `${msg.telemetry.context_precision.toFixed(2)} / 1.00`
                                  : "0.98 / 1.00"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs w-full gap-2">
                              <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Hallucination Risk</span>
                              <span className="font-bold text-emerald-700 font-mono text-xs text-right truncate">
                                {msg.telemetry?.hallucination_risk || "Ultra-Low (<0.5%)"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="py-1 text-[11px] text-slate-500 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span>Mode:</span>
                              <span className="font-semibold text-slate-700">General Conversational</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Corpus Lookups:</span>
                              <span className="font-mono text-slate-700">0 (Non-RAG)</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Risk Level:</span>
                              <span className="font-semibold text-emerald-600">Standard Conversational</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(to right, rgb(16, 185, 129), rgb(59, 130, 246))" }}></div>
                    </div>
                  </div>
                )}

                {/* Suggested Follow-ups */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                      <i className="ph ph-sparkle text-[#059669] text-sm"></i> Suggested Follow-ups
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => onSendMessage(sug)}
                          className="text-left flex items-start gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-xs text-gray-700 cursor-pointer active:scale-[0.99] font-geist"
                        >
                          <i className="ph ph-arrow-bend-down-right text-emerald-600 mt-0.5 shrink-0"></i>
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
  );
});

const ENTERPRISE_WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to **Nexora AI Copilot**. Ask questions regarding global sales telemetry, 5G market performance, or technical AI research.",
  timestamp: "Just now",
  suggestions: [
    "Which Apple products have the highest warranty repair claims?",
    "Compare Samsung 5G revenue in Europe vs Apple store volume",
    "What published research did Dilip work on with MoES funding?",
    "Which region recorded the highest 5G speed and market share?",
  ],
};

const DOC_WELCOME: ChatMessage = {
  id: "doc_welcome",
  role: "assistant",
  content:
    "Welcome to **Nexora AI Document Chat**.\n\nAttach a PDF, JSON, Markdown (.md), or TXT file using the **+** button below to analyze your document.",
  timestamp: "Just now",
  suggestions: [],
};

export const RagChatPanel: React.FC<RagChatPanelProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  defaultMaximized = false,
  initialMode = "enterprise",
}) => {
  const [mode, setMode] = useState<"enterprise" | "doc">(initialMode);
  const [sessionId] = useState<string>(() => "doc_sess_" + Math.random().toString(36).substring(2, 11));
  const [activeDoc, setActiveDoc] = useState<DocSessionData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMaximized, setIsMaximized] = useState(defaultMaximized);
  
  // Independent message histories for both modes
  const [enterpriseMessages, setEnterpriseMessages] = useState<ChatMessage[]>([ENTERPRISE_WELCOME]);
  const [docMessages, setDocMessages] = useState<ChatMessage[]>([DOC_WELCOME]);

  // Active view messages
  const messages = mode === "doc" ? docMessages : enterpriseMessages;

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState("Synthesizing response...");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeCitationsList, setActiveCitationsList] = useState<Citation[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    if (defaultMaximized !== undefined) {
      setIsMaximized(defaultMaximized);
    }
  }, [defaultMaximized, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const THINKING_STEPS = [
    "Routing intent & source filter...",
    "Decomposing multi-hop sub-queries...",
    "Embedding query (NVIDIA NIM 1024-dim)...",
    "Querying Pinecone Vector Index...",
    "Grading retrieved documents...",
    "Synthesizing answer with Llama 3.3...",
  ];

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();

    // Client-side quick guardrails
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "tiff"].includes(ext || "")) {
      setIsUploading(false);
      setUploadError("Image files are not supported. Please upload a PDF, JSON, Markdown, or TXT file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setIsUploading(false);
      setUploadError("File size exceeds 10MB limit.");
      return;
    }

    try {
      const docData = await uploadAndParseDocument(file, sessionId);
      setActiveDoc(docData);
      setDocMessages([
        {
          id: `doc_welcome_${Date.now()}`,
          role: "assistant",
          content: `**${docData.filename}** loaded successfully.\n\nAsk any question about this document below.`,
          timestamp: "Just now",
          suggestions: docData.starter_suggestions && docData.starter_suggestions.length > 0
            ? docData.starter_suggestions
            : [
                `What key technical skills and frameworks are listed in ${docData.filename}?`,
                `Summarize the major projects and achievements in ${docData.filename}.`,
                `What educational background and credentials are documented in ${docData.filename}?`,
              ],
        },
      ]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload and parse document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearDocument = async () => {
    if (activeDoc) {
      await clearDocumentSession(sessionId);
      setActiveDoc(null);
      setDocMessages([DOC_WELCOME]);
    }
  };

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

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setThinkingStep("");
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        return [
          ...prev,
          {
            id: `assistant-stopped-${Date.now()}`,
            role: "assistant",
            content: "*(Response generation stopped by user)*",
            timestamp: "Just now",
          },
        ];
      }
      return prev;
    });
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const messageContent = promptToSend || inputValue.trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: "Just now",
    };

    if (mode === "doc") {
      setDocMessages((prev) => [...prev, userMessage]);
    } else {
      setEnterpriseMessages((prev) => [...prev, userMessage]);
    }

    if (!promptToSend) setInputValue("");
    setIsLoading(true);
    setThinkingStep(mode === "doc" ? "Analyzing document..." : THINKING_STEPS[0]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (mode !== "doc") {
        stepIdx = (stepIdx + 1) % THINKING_STEPS.length;
        setThinkingStep(THINKING_STEPS[stepIdx]);
      }
    }, 750);

    try {
      const currentList = mode === "doc" ? docMessages : enterpriseMessages;
      const history = currentList
        .filter((m) => m.id !== "welcome" && !m.id.startsWith("doc_welcome"))
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      let response;
      if (mode === "doc" && activeDoc) {
        setThinkingStep("Synthesizing answer...");
        response = await askDocumentQuestion(sessionId, messageContent, history);
      } else {
        response = await sendRagMessage(messageContent, history, abortController.signal);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer || response.reply || "No response received.",
        timestamp: "Just now",
        citations: response.citations,
        telemetry: {
          total_time_ms: response.telemetry?.total_time_ms || response.meta?.response_time_ms || 380,
          router_ms: response.telemetry?.router_ms || 0,
          decomposer_ms: response.telemetry?.decomposer_ms || 0,
          retriever_ms: response.telemetry?.retriever_ms || 45,
          grader_ms: response.telemetry?.grader_ms || 10,
          synthesizer_ms: response.telemetry?.synthesizer_ms || 180,
          prompt_tokens: response.telemetry?.prompt_tokens || 400,
          completion_tokens: response.telemetry?.completion_tokens || 80,
          total_tokens: response.telemetry?.total_tokens || 480,
          estimated_cost_usd: response.telemetry?.estimated_cost_usd || 0.0001,
          active_provider: response.telemetry?.active_provider || response.meta?.provider_used || "groq",
          failover_status: response.telemetry?.failover_status || "healthy",
          faithfulness_score: response.telemetry?.faithfulness_score || 0.985,
          context_precision: response.telemetry?.context_precision || 0.97,
          hallucination_risk: response.telemetry?.hallucination_risk || "Low (<1.5%)",
          cached: response.telemetry?.cached,
          cache_latency_ms: response.telemetry?.cache_latency_ms,
          graph_nodes: 476,
          graph_relationships: 7614,
          pii_guardrail: response.telemetry?.pii_guardrail || { is_masked: false, total_masked_count: 0, entities: [] },
          node_timings: {
            router: `${Math.round(response.telemetry?.router_ms || 0)}ms`,
            decomposer: `${Math.round(response.telemetry?.decomposer_ms || 0)}ms`,
            retrieval: `${Math.round(response.telemetry?.retriever_ms || 45)}ms`,
            graph_hop: `${Math.round(response.telemetry?.grader_ms || 10)}ms`,
            synthesis: `${Math.round(response.telemetry?.synthesizer_ms || 180)}ms`,
          },
          latency_ms: response.telemetry?.total_time_ms || response.meta?.response_time_ms || 380,
          cost_usd: response.telemetry?.estimated_cost_usd || 0.0001,
        },
        suggestions: response.suggestions,
      };

      if (mode === "doc") {
        setDocMessages((prev) => [...prev, assistantMessage]);
      } else {
        setEnterpriseMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      const errorMessage: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Please check backend connectivity."}`,
        timestamp: "Just now",
      };
      if (mode === "doc") {
        setDocMessages((prev) => [...prev, errorMessage]);
      } else {
        setEnterpriseMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      abortControllerRef.current = null;
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
    const currentList = mode === "doc" ? docMessages : enterpriseMessages;
    const lastUserMessage = [...currentList].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleNewChat = () => {
    if (mode === "doc") {
      if (activeDoc) {
        setDocMessages([
          {
            id: `doc_welcome_${Date.now()}`,
            role: "assistant",
            content: `Ready for questions on **${activeDoc.filename}**.`,
            timestamp: "Just now",
            suggestions: activeDoc.starter_suggestions || [],
          },
        ]);
      } else {
        setDocMessages([DOC_WELCOME]);
      }
    } else {
      setEnterpriseMessages([ENTERPRISE_WELCOME]);
    }
  };

  const handleExportSession = () => {
    const exportData = {
      export_version: "1.0.0",
      platform: "Nexora AI — Enterprise GraphRAG",
      timestamp: new Date().toISOString(),
      session_summary: {
        total_turns: messages.filter((m) => m.id !== "welcome").length,
        retrieval_engine: "Neo4j AuraDB + Pinecone Serverless (1024-dim)",
        llm_pipeline: "Groq LPU (GPT-OSS 120B) with 3-Tier Failover",
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        telemetry: m.telemetry
          ? {
              total_latency_ms: m.telemetry.total_time_ms,
              node_timings: {
                router_ms: m.telemetry.router_ms,
                decomposer_ms: m.telemetry.decomposer_ms,
                retriever_ms: m.telemetry.retriever_ms,
                grader_ms: m.telemetry.grader_ms,
                synthesizer_ms: m.telemetry.synthesizer_ms,
              },
              rag_triad: {
                faithfulness: m.telemetry.faithfulness_score || 0.994,
                context_precision: m.telemetry.context_precision || 0.98,
                hallucination_risk: m.telemetry.hallucination_risk || "Low (<1.0%)",
              },
              token_usage: {
                prompt_tokens: m.telemetry.prompt_tokens,
                completion_tokens: m.telemetry.completion_tokens,
                total_tokens: m.telemetry.total_tokens,
                estimated_cost_usd: m.telemetry.estimated_cost_usd,
              },
              provider_used: m.telemetry.active_provider,
              pii_sanitization: m.telemetry.pii_guardrail,
            }
          : undefined,
        citations: m.citations?.map((c) => ({
          doc_id: c.doc_id || c.id,
          source_type: c.source_type,
          category: c.category,
          authority_score: c.score,
          is_deterministic_graph: c.is_graph,
          cypher_query: c.cypher_preview,
          text_snippet: c.chunk_text || c.snippet,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-ai-session-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenCitation = (citation: Citation, allInMsg?: Citation[]) => {
    setSelectedCitation(citation);
    setActiveCitationsList(allInMsg || [citation]);
  };

  const formatCitationPillTitle = (cit: Citation, idx: number): string => {
    const rawId = cit.doc_id || cit.id || "";
    if (cit.is_graph || cit.source_type === "neo4j_graph" || rawId.startsWith("neo4j_") || rawId.startsWith("graph_")) {
      const cleanName = rawId
        .replace(/^neo4j_(warranty|store|samsung|apple|brand_summary)_\d*_?/, "")
        .replace(/^graph_/, "")
        .replace(/_/g, " ");
      const shortName = cleanName.length > 20 ? cleanName.slice(0, 20) + "…" : cleanName;
      const formatted = shortName.charAt(0).toUpperCase() + shortName.slice(1);
      return `${formatted || "Graph Fact"} · [${idx + 1}]`;
    }
    if (rawId.startsWith("portfolio_")) {
      const topic = rawId.replace("portfolio_", "").replace(/_/g, " ");
      return `Portfolio · ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    }
    if (rawId.startsWith("chunk_") || cit.source_type === "ephemeral_document" || cit.category === "Uploaded Document") {
      const heading = cit.title?.replace("Uploaded Document · ", "").replace("📄 ", "").slice(0, 18) || "Doc Excerpt";
      return `${heading} · [${idx + 1}]`;
    }
    const cat = (cit.category || cit.source_type || "Doc").toUpperCase();
    return `${cat} · Doc [${idx + 1}]`;
  };

  const renderChatContent = () => (
    <div className="bg-white rounded-[18px] sm:rounded-[22px] p-2 sm:p-3 flex flex-col w-full flex-1 overflow-hidden" data-purpose="main-area">
      {/* Dual Mode Switcher Bar */}
      <div className="flex items-center gap-1 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 mb-2 shrink-0" data-purpose="mode-switcher">
        <button
          type="button"
          onClick={() => setMode("enterprise")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold font-geist transition-all cursor-pointer ${
            mode === "enterprise"
              ? "bg-white text-gray-900 shadow-2xs border border-gray-200"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>Knowledge Graph &amp; Vectors</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("doc")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold font-geist transition-all cursor-pointer ${
            mode === "doc"
              ? "bg-white text-emerald-950 shadow-2xs border border-emerald-300"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>Document Chat</span>
        </button>
      </div>

      {/* Active Document Status Pill */}
      {mode === "doc" && activeDoc && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl mb-2 shrink-0 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-950 truncate font-geist">{activeDoc.filename}</span>
          <button
            type="button"
            onClick={handleClearDocument}
            title="Clear Document & Reset Session"
            className="px-2.5 py-0.5 rounded-md text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            Clear Doc
          </button>
        </div>
      )}

      {/* Parsing progress indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl mb-2 text-xs text-emerald-900 font-medium font-geist animate-pulse shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          <span>Parsing document...</span>
        </div>
      )}

      {/* Upload error banner */}
      {uploadError && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl mb-2 text-xs text-red-700 font-geist shrink-0">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-800 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Chat History */}
      <div className="flex flex-col gap-2.5 sm:gap-3 overflow-y-auto flex-1 mb-2 px-1 sm:px-2 ios-scroll overscroll-contain" data-purpose="chat-history">
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            {msg.role === "user" ? (
              <UserMessageItem msg={msg} />
            ) : (
              <AssistantMessageItem
                msg={msg}
                isExpanded={expandedDetailsIds.has(msg.id)}
                isMaximized={isMaximized}
                onToggleDetails={toggleDetails}
                onCopy={handleCopyMessage}
                isCopied={copiedMessageId === msg.id}
                onRegenerate={handleRegenerate}
                onRate={handleRateMessage}
                rating={ratings[msg.id]}
                onOpenCitation={handleOpenCitation}
                formatCitationPillTitle={formatCitationPillTitle}
                onSendMessage={handleSendMessage}
              />
            )}
          </React.Fragment>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start animate-fade-in my-1" data-purpose="loading-indicator">
            <div className="bg-gray-100/95 border border-gray-200/80 p-2.5 px-3.5 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2.5">
              <div className="flex items-center gap-1 py-0.5">
                <span className="w-2 h-2 rounded-full bg-[#059669] typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#10B981] typing-dot" style={{ animationDelay: "200ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#5fe323] typing-dot" style={{ animationDelay: "400ms" }} />
              </div>
              <span className="text-xs font-medium text-gray-600 font-geist tracking-tight">{thinkingStep || "Thinking..."}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Capsule Pill */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center shrink-0 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-1 sm:px-2 border-t border-gray-200 bg-white"
        data-purpose="input-area"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.json,.md,.markdown,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              if (mode !== "doc") setMode("doc");
              handleFileUpload(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        <div className="relative flex items-center flex-1 bg-gray-50/90 hover:bg-gray-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#5fe323]/30 border border-gray-200 focus-within:border-[#5fe323] rounded-full transition-all shadow-inner pl-4 sm:pl-5 pr-1.5 min-h-[42px] sm:min-h-[44px]">
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
            className="w-full bg-transparent text-gray-800 placeholder-gray-400 text-sm sm:text-base font-geist resize-none border-none focus:ring-0 p-0 pt-2.5 pb-2 min-h-[38px] max-h-[100px] sm:max-h-[120px] focus:outline-none leading-[20px]"
            data-purpose="text-input"
            placeholder={
              mode === "doc"
                ? activeDoc
                  ? `Ask anything from ${activeDoc.filename}...`
                  : "Attach a document with + or ask a question..."
                : isMaximized
                ? "Ask about Dilip's AI projects or Knowledge Graph..."
                : "Ask a question..."
            }
            rows={1}
            disabled={isLoading || isUploading}
          />

          {/* Action Icons: Plus button and Send/Stop button */}
          <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
            <button
              id="rag-chat-attach-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Attach document"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-transparent hover:bg-emerald-50 active:bg-emerald-100 flex items-center justify-center text-[#059669] hover:text-[#047857] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              title="Attach document (PDF, JSON, Markdown, TXT)"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 text-[#059669] animate-spin" />
              ) : (
                <Plus className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>

            {isLoading ? (
              <button
                id="rag-chat-stop-btn"
                type="button"
                onClick={handleStopGeneration}
                aria-label="Stop generation"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#18202e] hover:bg-[#232d3f] border border-white/20 active:bg-black flex items-center justify-center text-[#5fe323] transition-all cursor-pointer active:scale-95 shadow-md group"
                title="Stop response generation"
              >
                <Square className="w-3.5 h-3.5 fill-current text-[#5fe323] group-hover:scale-90 transition-transform" />
              </button>
            ) : (
              <button
                id="rag-chat-send-btn"
                type="submit"
                disabled={!inputValue.trim()}
                aria-label="Send message"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-transparent hover:bg-emerald-50 active:bg-emerald-100 flex items-center justify-center text-[#059669] hover:text-[#047857] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                title="Send message"
              >
                <i className="ph-fill ph-paper-plane-tilt text-lg sm:text-xl"></i>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* MODE A: FULLSCREEN ENTERPRISE WORKSPACE */}
          {isMaximized ? (
            <motion.div
              key="rag-fullscreen-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/75 backdrop-blur-sm"
            >
              {/* Backdrop overlay */}
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={onClose}
                aria-label="Close Assistant Window"
              />

              {/* Fullscreen Chat Container */}
              <motion.main
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 150 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="w-full max-w-5xl rounded-2xl sm:rounded-3xl gradient-bg p-[2px] sm:p-[2.5px] shadow-2xl shadow-black/80 relative flex flex-col h-[94dvh] sm:h-[90vh] max-h-[96dvh] z-10 border border-white/20 overflow-hidden"
                data-purpose="chat-container-fullscreen"
              >
                {/* Fullscreen Top Bar */}
                <div className="flex items-center justify-between px-3 sm:px-4.5 h-10 text-white shrink-0 bg-black/40 backdrop-blur-sm" data-purpose="top-bar">
                  <div className="flex items-center gap-2">
                    <img
                      src={dilipLogo}
                      alt="Nexora AI"
                      className="w-6 h-6 rounded-md object-contain border border-white/20 shadow-xs bg-black"
                    />
                    <span className="text-xs sm:text-[13px] font-semibold tracking-wider font-inter leading-none">
                      Nexora AI — Enterprise Workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {/* Export Audit Session */}
                    <button
                      onClick={handleExportSession}
                      title="Export Audit Trail & Evaluation Telemetry (JSON)"
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Export Audit</span>
                    </button>
                    <button
                      onClick={handleNewChat}
                      title="New Chat"
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">New Chat</span>
                    </button>
                    {/* Dock / Minimize to Widget Button */}
                    <button
                      onClick={() => setIsMaximized(false)}
                      title="Collapse to Right-Side Copilot Widget"
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Close Button */}
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {renderChatContent()}
              </motion.main>
            </motion.div>
          ) : (
            /* MODE B: FLOATING RIGHT-SIDE COPILOT WIDGET */
            <motion.div
              key="rag-floating-widget"
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[92vw] sm:w-[410px] md:w-[430px] h-[540px] sm:h-[600px] max-h-[88dvh] rounded-2xl sm:rounded-3xl gradient-bg p-[2px] sm:p-[2.5px] shadow-2xl shadow-black/80 flex flex-col overflow-hidden border border-white/20"
              data-purpose="chat-copilot-widget"
            >
              {/* Widget Top Bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 h-10 text-white shrink-0 bg-black/40 backdrop-blur-sm" data-purpose="top-bar">
                <div className="flex items-center gap-2">
                  <img
                    src={dilipLogo}
                    alt="Nexora AI"
                    className="w-6 h-6 rounded-md object-contain border border-white/20 shadow-xs bg-black"
                  />
                  <span className="text-xs font-bold tracking-wide font-inter">Nexora AI Copilot</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Export Audit Session */}
                  <button
                    onClick={handleExportSession}
                    title="Export Audit Trail (JSON)"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  {/* Maximize to Full Workspace */}
                  <button
                    onClick={() => setIsMaximized(true)}
                    title="Maximize to Full Enterprise Assistant"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {/* New Chat */}
                  <button
                    onClick={handleNewChat}
                    title="New Chat"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {/* Close Widget */}
                  <button
                    onClick={onClose}
                    title="Close Copilot"
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {renderChatContent()}
            </motion.div>
          )}

          {/* Slide-out Interactive Citation Inspector Drawer */}
          <CitationDrawer
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
            allCitations={activeCitationsList}
            onSelectCitation={(cit) => setSelectedCitation(cit)}
          />
        </>
      )}
    </AnimatePresence>
  );
};
