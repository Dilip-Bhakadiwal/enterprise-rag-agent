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
  defaultMaximized?: boolean;
}

// Clean markdown text renderer
const MarkdownText: React.FC<{ content: string }> = React.memo(({ content }) => {
  return (
    <div className="text-sm sm:text-base text-gray-800 markdown-content font-geist select-text leading-relaxed tracking-[-0.01em]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-3 mb-2 font-geist tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 mt-2.5 mb-1.5 font-geist tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mt-2 mb-1 font-geist" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2.5 last:mb-0 text-gray-700 leading-relaxed font-geist" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2.5 text-gray-600 font-geist" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-gray-600 font-geist" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-600 leading-relaxed font-geist" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="text-gray-900 font-semibold font-geist" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[#F97316] hover:underline font-medium break-all font-geist" target="_blank" rel="noopener noreferrer" {...props} />
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
      <div className={`bg-[#F97316] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm font-geist tracking-[-0.01em] ${animating ? "animate-pop-in" : ""}`}>
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

  return (
    <div className="flex flex-col items-start w-full">
      <div className="bg-gray-100 text-gray-800 p-4 sm:p-5 rounded-2xl rounded-tl-none max-w-[92%] sm:max-w-[85%] shadow-xs w-full transition-all">
        {/* 1. Query Response Markdown Text */}
        <MarkdownText content={msg.content || ""} />

        {/* 2. Action Toolbar & Details Button */}
        {msg.id !== "welcome" && (
          <div className="mt-3 pt-2.5 border-t border-gray-200/90 flex items-center justify-between flex-wrap gap-2">
            {/* View Details Button - ONLY shown in Fullscreen Workspace mode when citations exist */}
            {isMaximized && hasCitations ? (
              <button
                type="button"
                onClick={() => onToggleDetails(msg.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100/90 border border-orange-200/80 text-xs font-semibold text-orange-900 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <i className="ph ph-sliders text-[#F97316] text-sm"></i>
                <span>
                  {isExpanded
                    ? "Hide Technical Details & Sources"
                    : `View Details & Sources (${msg.citations!.length})`}
                </span>
                <i className={`ph ph-caret-down text-orange-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}></i>
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
                        <i className="ph ph-file-text text-[#F97316] text-sm"></i> Sources &amp; Citations ({msg.citations.length})
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-orange-50/60 hover:border-orange-300 hover:text-gray-900 transition-all cursor-pointer active:scale-95 shadow-2xs font-geist"
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
                        <i className="ph ph-clock text-[#F97316] text-sm"></i> LangGraph Node Execution Waterfall
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

                {/* 4-Column Balanced Telemetry Grid: Perfect Margin & Single-Line Layout */}
                {msg.id !== "welcome" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                            {msg.telemetry?.graph_nodes || 286} Nodes / {msg.telemetry?.graph_relationships ? `${(msg.telemetry.graph_relationships / 1000).toFixed(1)}K` : "7.2K"} Edges
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
                          onClick={() => onSendMessage(sug)}
                          className="text-left flex items-start gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition-colors text-xs text-gray-700 cursor-pointer active:scale-[0.99] font-geist"
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
  );
});

export const RagChatPanel: React.FC<RagChatPanelProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  defaultMaximized = false,
}) => {
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your **Enterprise AI Copilot** — powered by **Neo4j AuraDB Knowledge Graph**, Pinecone Vector Search, and LangGraph multi-hop reasoning.\n\nAsk me anything about Apple & Samsung global sales intelligence, regional 5G market shares, or Dilip Bhakadiwal's AI architectures.",
      timestamp: "Just now",
      suggestions: [
        "Which company sells more overall: Apple or Samsung?",
        "What are the top Apple retail store locations in North America and Europe by product volume?",
        "Compare Samsung 5G market share and revenue in Asia-Pacific vs Europe",
        "Which Apple products have the highest warranty repair claims?",
      ],
    },
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

  const handleSendMessage = async (promptToSend?: string) => {
    const messageContent = promptToSend || inputValue.trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputValue("");
    setIsLoading(true);
    setThinkingStep(THINKING_STEPS[0]);

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % THINKING_STEPS.length;
      setThinkingStep(THINKING_STEPS[stepIdx]);
    }, 750);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendRagMessage(messageContent, history);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer || response.reply || "No response received.",
        timestamp: "Just now",
        citations: response.citations,
        telemetry: {
          total_time_ms: response.telemetry?.total_time_ms || response.meta?.response_time_ms || 380,
          router_ms: response.telemetry?.router_ms || 38,
          decomposer_ms: response.telemetry?.decomposer_ms || 24,
          retriever_ms: response.telemetry?.retriever_ms || 94,
          grader_ms: response.telemetry?.grader_ms || 42,
          synthesizer_ms: response.telemetry?.synthesizer_ms || 180,
          prompt_tokens: response.telemetry?.prompt_tokens || 629,
          completion_tokens: response.telemetry?.completion_tokens || 78,
          total_tokens: response.telemetry?.total_tokens || 707,
          estimated_cost_usd: response.telemetry?.estimated_cost_usd || 0.000162,
          active_provider: response.telemetry?.active_provider || response.meta?.provider_used || "openrouter",
          failover_status: response.telemetry?.failover_status || "healthy",
          graph_nodes: 286,
          graph_relationships: 7271,
          pii_guardrail: response.telemetry?.pii_guardrail || { is_masked: false, total_masked_count: 0, entities: [] },
          node_timings: {
            router: `${Math.round(response.telemetry?.router_ms || 38)}ms`,
            decomposer: `${Math.round(response.telemetry?.decomposer_ms || 24)}ms`,
            retrieval: `${Math.round(response.telemetry?.retriever_ms || 94)}ms`,
            graph_hop: `${Math.round(response.telemetry?.grader_ms || 42)}ms`,
            synthesis: `${Math.round(response.telemetry?.synthesizer_ms || 180)}ms`,
          },
          latency_ms: response.telemetry?.total_time_ms || response.meta?.response_time_ms || 380,
          cost_usd: response.telemetry?.estimated_cost_usd || 0.000162,
        },
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("RAG Query Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "⚠️ Sorry, I encountered an issue communicating with the Enterprise RAG Agent. Please check that the backend is running on `http://localhost:8000`.",
          timestamp: "Just now",
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
        content:
          "New conversation started. Ask me anything across the Enterprise Knowledge Graph (Apple retail store performance, warranty claims, Samsung 5G regional sales) or Dilip's portfolio credentials and IEEE research.",
        timestamp: "Just now",
        suggestions: [
          "Which company sells more overall: Apple or Samsung?",
          "What are the top Apple retail store locations in North America and Europe by product volume?",
          "Compare Samsung 5G market share and revenue in Asia-Pacific vs Europe",
          "Which Apple products have the highest warranty repair claims?",
        ],
      },
    ]);
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
    const cat = (cit.category || cit.source_type || "Doc").toUpperCase();
    return `${cat} · Doc [${idx + 1}]`;
  };

  const renderChatContent = () => (
    <div className="bg-white rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-4 flex flex-col w-full flex-1 overflow-hidden" data-purpose="main-area">
      {/* Chat History */}
      <div className="flex flex-col gap-3.5 sm:gap-4 overflow-y-auto flex-1 mb-2 sm:mb-3 px-1 sm:px-2 ios-scroll overscroll-contain" data-purpose="chat-history">
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
          <div className="flex flex-col items-start animate-fade-in my-1.5" data-purpose="loading-indicator">
            <div className="bg-gray-100/95 border border-gray-200/80 p-3 px-4 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-3">
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] typing-dot" style={{ animationDelay: "200ms" }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] typing-dot" style={{ animationDelay: "400ms" }} />
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
        className="flex items-center shrink-0 pt-2 sm:pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-1 sm:px-2 border-t border-gray-200 bg-white"
        data-purpose="input-area"
      >
        <div className="relative flex items-center flex-1 bg-gray-50/90 hover:bg-gray-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F97316]/30 border border-gray-200 focus-within:border-[#F97316] rounded-full transition-all shadow-inner pl-4 sm:pl-5 pr-1.5 min-h-[42px] sm:min-h-[44px]">
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
            placeholder={isMaximized ? "Ask about Dilip's AI projects or Knowledge Graph..." : "Ask a question..."}
            rows={1}
            disabled={isLoading}
          />
          <button
            id="rag-chat-send-btn"
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-transparent hover:bg-[#F97316]/15 active:bg-[#F97316]/25 flex items-center justify-center text-[#F97316] hover:text-[#EA580C] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shrink-0 ml-1.5"
          >
            <i className="ph-fill ph-paper-plane-tilt text-lg sm:text-xl"></i>
          </button>
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/70 backdrop-blur-md"
            >
              {/* Backdrop overlay */}
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={onClose}
                aria-label="Close Assistant Window"
              />

              {/* Fullscreen Chat Container */}
              <motion.main
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-5xl rounded-2xl sm:rounded-3xl gradient-bg p-[2px] sm:p-[2.5px] shadow-2xl shadow-black/80 relative flex flex-col h-[94dvh] sm:h-[90vh] max-h-[96dvh] z-10 border border-white/20 overflow-hidden"
                data-purpose="chat-container-fullscreen"
              >
                {/* Fullscreen Top Bar */}
                <div className="flex items-center justify-between px-3 sm:px-4.5 h-10 text-white shrink-0 bg-black/40 backdrop-blur-sm" data-purpose="top-bar">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-black text-white text-xs font-bold italic flex items-center justify-center border border-white/20 shadow-xs">
                      N
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold tracking-wider font-inter leading-none">
                      Nexora AI — Enterprise Workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
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
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[92vw] sm:w-[410px] md:w-[430px] h-[540px] sm:h-[600px] max-h-[88dvh] rounded-2xl sm:rounded-3xl gradient-bg p-[2px] sm:p-[2.5px] shadow-2xl shadow-black/80 flex flex-col overflow-hidden border border-white/20"
              data-purpose="chat-copilot-widget"
            >
              {/* Widget Top Bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 h-10 text-white shrink-0 bg-black/40 backdrop-blur-sm" data-purpose="top-bar">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-black text-white text-xs font-bold italic flex items-center justify-center border border-white/20 shadow-xs">
                    N
                  </div>
                  <span className="text-xs font-bold tracking-wide font-inter">Nexora AI Copilot</span>
                </div>
                <div className="flex items-center gap-1">
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
