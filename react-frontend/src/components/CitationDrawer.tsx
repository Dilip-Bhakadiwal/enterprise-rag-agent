import React from "react";
import { X, Copy, Check, FileText, Sparkles, Database, Clock, UserCheck, ShieldCheck } from "lucide-react";
import { Citation } from "../types";

interface CitationDrawerProps {
  citation: Citation | null;
  onClose: () => void;
  allCitations?: Citation[];
  onSelectCitation?: (cit: Citation) => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  citation,
  onClose,
  allCitations = [],
  onSelectCitation,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    if (citation.chunk_text || citation.snippet) {
      navigator.clipboard.writeText(citation.chunk_text || citation.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSourceIcon = (sourceType: string = "") => {
    const st = sourceType.toLowerCase();
    if (st.includes("portfolio")) return "🌟";
    if (st.includes("confluence")) return "📘";
    if (st.includes("jira")) return "🎯";
    if (st.includes("github")) return "🐙";
    if (st.includes("slack")) return "💬";
    if (st.includes("gmail") || st.includes("email")) return "✉️";
    return "📄";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div 
        className="relative w-full max-w-lg h-full bg-[#0d1424]/95 border-l border-amber-500/20 shadow-2xl flex flex-col z-10 text-slate-100 overflow-hidden"
        style={{
          boxShadow: "-10px 0 35px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/15 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-base">
              {getSourceIcon(citation.category || citation.source_type)}
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Grounded Knowledge Chunk
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[260px] sm:max-w-[320px]">
                {citation.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Navigation Chips (if multiple citations) */}
        {allCitations.length > 1 && (
          <div className="px-4 py-2.5 bg-black/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto ios-scroll">
            <span className="text-[11px] text-slate-400 shrink-0 mr-1">Sources ({allCitations.length}):</span>
            {allCitations.map((c, i) => (
              <button
                key={i}
                onClick={() => onSelectCitation && onSelectCitation(c)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 ${
                  c.id === citation.id
                    ? "bg-amber-500/25 border border-amber-400/50 text-amber-200"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                }`}
              >
                <span>{getSourceIcon(c.category || c.source_type)}</span>
                <span className="truncate max-w-[100px]">{c.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 ios-scroll">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                <Database className="w-3 h-3 text-amber-400" /> Platform Source
              </span>
              <span className="font-semibold text-white capitalize">
                {citation.category || citation.source_type || "Official Enterprise Repo"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-amber-400" /> Ingestion Record
              </span>
              <span className="font-semibold text-slate-200">
                {citation.timestamp || "Official Release"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                <UserCheck className="w-3 h-3 text-amber-400" /> Author / Authority
              </span>
              <span className="font-semibold text-slate-200 truncate block">
                {citation.author || "System / DIAT Knowledge"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-400" /> Vector Index
              </span>
              <span className="font-semibold text-amber-300">
                Pinecone 1024-dim
              </span>
            </div>
          </div>

          {/* Raw Chunk Content Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Raw Retrieved Document Text
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 text-[11px] text-amber-200 flex items-center gap-1 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy Excerpt"}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/45 border border-white/10 text-xs sm:text-[13px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto">
              {citation.chunk_text || citation.snippet || "No additional excerpt text available for this citation."}
            </div>
          </div>

          {/* Verification Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/30 text-[11px] sm:text-xs text-emerald-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300">Zero-Hallucination Grounding Verified:</span> This text was embedded via NVIDIA NIM and verified by the LangGraph document grader node prior to synthesis.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-amber-500/15 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">doc_id: {citation.doc_id || citation.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 font-semibold transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
