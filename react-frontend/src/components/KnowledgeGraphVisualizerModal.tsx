import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Activity } from "lucide-react";
import { KnowledgeGraphCanvas } from "./KnowledgeGraphCanvas";
import { INITIAL_NODES, INITIAL_LINKS } from "../data/knowledgeGraphData";
import { GraphNode, GraphLink } from "../types/graph";

// ── Persistent Module-Level Cache (Lazy on-demand only) ─────────────────────
let _cachedGraphData: { nodes: GraphNode[]; links: GraphLink[] } | null = null;

const fetchGraphDataOnDemand = async () => {
  if (_cachedGraphData) return _cachedGraphData;
  try {
    const response = await fetch("/api/graph/data");
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
  }
  return null;
};

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

  // ── Lazy Fetch: ONLY runs when Modal is opened (Zero resource use when closed) ──
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
          className="fixed inset-0 h-[100dvh] w-full z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none font-inter overflow-hidden"
        >
          {/* ── 1. Fullscreen Canvas (Unmounted when closed -> 0% CPU, 0 loops) ── */}
          <div className="absolute inset-0 w-full h-full z-10">
            <KnowledgeGraphCanvas
              nodes={liveNodes}
              links={liveLinks}
              selectedNodeId={selectedNode?.id || null}
              viewPerspective3D={false}
              onSelectNode={(node) => setSelectedNode(node)}
              onStatsUpdate={(calculatedFps) => {
                if (fpsRef.current) {
                  fpsRef.current.innerText = `${calculatedFps} FPS`;
                }
              }}
            />
          </div>

          {/* ── 2. Top Minimalist Floating Status Bar (iOS Safe-Area Aware) ── */}
          <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 z-30 flex items-center justify-between pointer-events-none">
            {/* Top-Left: Live Status Badge & FPS */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md text-[11px] sm:text-xs shadow-2xl">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-none">
                  {isNeo4jLive ? "Neo4j AuraDB Live" : "Solar Constellation"}
                </span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1 text-slate-300 font-mono text-[10px] sm:text-[11px]">
                <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                <span ref={fpsRef} className="text-emerald-400 font-semibold">30 FPS</span>
                <span>•</span>
                <span>{liveNodes.length} Nodes</span>
              </div>
            </div>

            {/* Top-Right: Sleek Glass Close Button */}
            <button
              onClick={onClose}
              className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-black/90 border border-white/20 hover:border-white/50 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md shadow-2xl touch-manipulation"
              aria-label="Close Knowledge Graph"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
