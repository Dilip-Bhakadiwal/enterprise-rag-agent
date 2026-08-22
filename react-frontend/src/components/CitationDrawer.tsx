import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";
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
  const [copiedText, setCopiedText] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Keyboard navigation (Escape to close, Arrow keys to navigate between sources)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!citation || allCitations.length <= 1) return;
      const currentIndex = allCitations.findIndex((c) => c.id === citation.id);
      if (e.key === "ArrowRight" && currentIndex < allCitations.length - 1) {
        onSelectCitation?.(allCitations[currentIndex + 1]);
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onSelectCitation?.(allCitations[currentIndex - 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [citation, allCitations, onClose, onSelectCitation]);

  if (!citation) return null;

  const handleCopyText = () => {
    const textToCopy = citation.chunk_text || citation.snippet || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyId = () => {
    const idToCopy = citation.doc_id || citation.id || "";
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const getCleanSourceLabel = (c: Citation, index: number): string => {
    const rawId = c.doc_id || c.id || "";
    if (rawId.startsWith("portfolio_")) {
      const topic = rawId.replace("portfolio_", "").replace(/_/g, " ");
      return `Dilip · ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    }
    
    if (c.chunk_text) {
      const firstLine = c.chunk_text.split("\n").map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith("#"))[0];
      if (firstLine && firstLine.length < 35) {
        return `Doc [${index + 1}] · ${firstLine}`;
      }
    }

    const platform = (c.category || c.source_type || "Doc").toUpperCase();
    return `${platform} · Doc [${index + 1}]`;
  };

  const currentIndex = allCitations.findIndex((c) => c.id === citation.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-stretch justify-end overflow-hidden">
        {/* Smooth Backdrop with subtle blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Slide-out Drawer (70% opacity / 30% background visibility through frosted glass) */}
        <motion.aside
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl h-full bg-[#0a0f1d]/70 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col z-10 text-slate-100 overflow-hidden font-sans"
          style={{
            backdropFilter: "blur(24px) saturate(140%)",
          }}
        >
          {/* Header - Clean, No icons or logos */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
            <div className="min-w-0 pr-4">
              <h3 className="text-base font-semibold text-white truncate">
                {getCleanSourceLabel(citation, currentIndex >= 0 ? currentIndex : 0)}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Bar (if query retrieved multiple sources) */}
          {allCitations.length > 1 && (
            <div className="px-6 py-2.5 bg-black/30 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto ios-scroll py-0.5 max-w-[calc(100%-85px)]">
                {allCitations.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectCitation?.(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      c.id === citation.id
                        ? "bg-amber-400 text-slate-950 font-semibold shadow-sm"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                    }`}
                  >
                    Doc [{idx + 1}]
                  </button>
                ))}
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={currentIndex <= 0}
                  onClick={() => onSelectCitation?.(allCitations[currentIndex - 1])}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous source (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-slate-400 px-1 font-mono">
                  {currentIndex + 1}/{allCitations.length}
                </span>
                <button
                  disabled={currentIndex >= allCitations.length - 1}
                  onClick={() => onSelectCitation?.(allCitations[currentIndex + 1])}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next source (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 ios-scroll">
            {/* Clean Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-amber-300 font-medium">
                {citation.category || citation.source_type || "Enterprise"}
              </span>

              {citation.author && (
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300">
                  Author: {citation.author}
                </span>
              )}

              {citation.timestamp && (
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300">
                  {citation.timestamp}
                </span>
              )}
            </div>

            {/* Document Chunk Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Document Excerpt
                </h4>
                <button
                  onClick={handleCopyText}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Excerpt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Clean Document Reader Sheet */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                <div className="text-[13.5px] sm:text-[14px] leading-[1.8] text-slate-200 select-text whitespace-pre-wrap font-sans font-normal tracking-normal">
                  {citation.chunk_text || citation.snippet || "No additional excerpt text is available for this citation."}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <button
              onClick={handleCopyId}
              className="hover:text-amber-300 transition-colors font-mono text-[11px] truncate max-w-[240px] cursor-pointer"
              title="Click to copy document ID"
            >
              <span>{citation.doc_id || citation.id}</span>
              {copiedId && <Check className="w-3 h-3 text-emerald-400 inline ml-1.5" />}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
};
