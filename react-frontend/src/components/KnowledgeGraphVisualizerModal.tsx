import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Activity } from "lucide-react";
import { KnowledgeGraphCanvas } from "./KnowledgeGraphCanvas";
import { INITIAL_NODES, INITIAL_LINKS } from "../data/knowledgeGraphData";
import { GraphNode, GraphLink } from "../types/graph";

const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string) || "";

// ── Persistent Module-Level Cache & Eager Background Prefetch ───────────────
let _cachedGraphData: { nodes: GraphNode[]; links: GraphLink[] } | null = null;
let _isPrefetching = false;

const fetchGraphDataOnDemand = async () => {
  if (_cachedGraphData) return _cachedGraphData;
  if (_isPrefetching) return null;
  _isPrefetching = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/graph/data`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === "connected" && data.nodes && data.nodes.length > 0) {
      _cachedGraphData = {
        nodes: data.nodes,
        links: data.links || [],
      };
      return _cachedGraphData;
    }
  } catch (err) {
    console.debug("Graph fetch:", err);
  } finally {
    _isPrefetching = false;
  }
  return null;
};

// Eager background prefetch so data is instantly warm
if (typeof window !== "undefined") {
  const prefetch = () => {
    fetchGraphDataOnDemand().catch(() => {});
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 2000 });
  } else {
    setTimeout(prefetch, 800);
  }
}

interface KnowledgeGraphVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRagWithTopic: (topic: string) => void;
}

export const KnowledgeGraphVisualizerModal: React.FC<KnowledgeGraphVisualizerModalProps> = ({
  isOpen,
  onClose,
  onOpenRagWithTopic,
}) => {
  const [liveNodes, setLiveNodes] = useState<GraphNode[]>(() => _cachedGraphData?.nodes || INITIAL_NODES);
  const [liveLinks, setLiveLinks] = useState<GraphLink[]>(() => _cachedGraphData?.links || INITIAL_LINKS);
  const [isNeo4jLive, setIsNeo4jLive] = useState<boolean>(() => Boolean(_cachedGraphData));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Direct DOM ref for FPS to prevent React re-renders
  const fpsRef = useRef<HTMLSpanElement>(null);

  // ── Lock Body Scroll & Lifecycle Management ──────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSelectedNode(null);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Sync with live Neo4j graph data ──
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadGraphData = async () => {
      if (_cachedGraphData) {
        setLiveNodes(_cachedGraphData.nodes);
        setLiveLinks(_cachedGraphData.links);
        setIsNeo4jLive(true);
        return;
      }
      const data = await fetchGraphDataOnDemand();
      if (isMounted && data) {
        setLiveNodes(data.nodes);
        setLiveLinks(data.links);
        setIsNeo4jLive(true);
      }
    };

    loadGraphData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="knowledge-graph-transparent-fullscreen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            touchAction: "none",
            overscrollBehavior: "contain",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
          className="fixed inset-0 h-[100dvh] w-full z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl select-none font-inter overflow-hidden"
        >
          {/* ── 1. Fullscreen Canvas (Unmounted when closed -> 0% CPU, 0 loops) ── */}
          <div className="absolute inset-0 w-full h-full z-10 bg-transparent">
            <KnowledgeGraphCanvas
              nodes={liveNodes}
              links={liveLinks}
              selectedNodeId={selectedNode?.id || null}
              viewPerspective3D={false}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </div>

          {/* ── 2. Sleek Glass Close Button (Top-Right) ── */}
          <div className="absolute top-4 sm:top-6 right-4 sm:right-8 z-30 pointer-events-auto">
            <button
              onClick={onClose}
              className="p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-white/40 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md shadow-2xl touch-manipulation"
              aria-label="Close Knowledge Graph"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Syncing pill indicator during initial cold stream */}
          {!isNeo4jLive && (
            <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono backdrop-blur-md shadow-xl animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Syncing 7,495 Neo4j AuraDB Entities...</span>
            </div>
          )}

          {/* ── 3. Floating Node Inspector Card (Bottom-sheet on mobile, top-right on desktop) ── */}
          {selectedNode && (
            <div className="absolute bottom-4 sm:bottom-auto sm:top-20 left-4 right-4 sm:left-auto sm:right-8 z-30 w-auto sm:w-80 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-4 duration-200">
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-black/90 border border-white/20 backdrop-blur-xl shadow-2xl text-white flex flex-col gap-2.5 sm:gap-3 max-h-[42vh] sm:max-h-none overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 shadow-md"
                      style={{
                        backgroundColor: selectedNode.color,
                        boxShadow: `0 0 12px ${selectedNode.glowColor || selectedNode.color}`,
                      }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
                        {selectedNode.label}
                      </h3>
                      <span
                        className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider font-semibold"
                        style={{ color: selectedNode.color }}
                      >
                        {selectedNode.subcategory || selectedNode.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {selectedNode.description}
                </p>

                {/* Metrics */}
                {selectedNode.metrics && Object.keys(selectedNode.metrics).length > 0 && (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px]">
                    {Object.entries(selectedNode.metrics).slice(0, 2).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider block">
                          {k.replace(/_/g, " ")}
                        </span>
                        <span className="font-semibold text-white truncate block">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ask Copilot Button */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenRagWithTopic(
                      `Give me a detailed breakdown of ${selectedNode.label} from the Neo4j Knowledge Graph.`
                    );
                  }}
                  className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-2.5 rounded-xl bg-[#5fe323] hover:bg-[#52c71f] active:bg-[#48b31a] text-black font-bold text-[11px] sm:text-xs shadow-lg shadow-[#5fe323]/20 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer select-none touch-manipulation"
                >
                  <span>Ask Copilot About This Entity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
