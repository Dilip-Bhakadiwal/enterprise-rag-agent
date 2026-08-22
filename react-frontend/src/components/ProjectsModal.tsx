import React, { useState } from "react";
import { X, Sparkles, ArrowUpRight, Github, ExternalLink, Layers, Terminal, Cpu, Database, Network, CheckCircle2, MessageSquare } from "lucide-react";
import { ProjectDetail } from "../types";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRagWithTopic: (topic: string) => void;
}

const FEATURED_PROJECTS: ProjectDetail[] = [
  {
    id: "marketpulse-ai",
    title: "MarketPulse AI",
    tagline: "Real-Time Agentic Financial Intelligence Terminal",
    category: "Agentic Systems",
    stack: ["LangGraph", "FastAPI", "WebSockets", "Python 3.11", "Redis", "OpenAI / Claude"],
    highlights: [
      "Orchestrates multi-agent cyclic graph with stateful memory and automated fallback routes.",
      "Digests real-time live ticker feeds and order book depth via asynchronous WebSockets.",
      "Specialized worker agents for Technical Analysis (RSI/MACD), Valuation, and News Sentiment.",
      "Sub-200ms decision latency with strict Pydantic v2 JSON schema validation."
    ],
    architectureNotes: "Stateful LangGraph architecture with checkpoint persistence, async event loops in FastAPI, and pub-sub caching via Redis.",
    metrics: ["<200ms Agent Latency", "99.9% Uptime", "50+ Concurrent Streams"]
  },
  {
    id: "redwood-inference",
    title: "Redwood Inference",
    tagline: "High-Throughput Enterprise RAG & Hybrid Retrieval Engine",
    category: "Enterprise RAG",
    stack: ["Pinecone", "Qdrant", "FastAPI", "Docker", "AWS ECS", "BM25", "Cross-Encoder"],
    highlights: [
      "Engineered hybrid dense-sparse vector search combining text-embedding-3-large with BM25 keyword tokens.",
      "Dynamic multi-stage reranking pipeline with Cross-Encoders reducing hallucinations by 64%.",
      "Parent-child chunk linking and sliding window context packing for complex technical manuals.",
      "Automated CI/CD deployment on AWS ECS Fargate with Prometheus & OpenTelemetry tracing."
    ],
    architectureNotes: "Two-stage retrieval pipeline with dynamic query expansion, vectorized Pinecone index, and AWS Fargate auto-scaling.",
    metrics: ["500+ QPS Capacity", "p95 <180ms Latency", "64% Hallucination Reduction"]
  },
  {
    id: "moes-geophysical-ai",
    title: "Geophysical Deep Learning Research",
    tagline: "Deep Neural Models for Predictive Atmospheric Modeling (MoES Funded)",
    category: "Published Research",
    stack: ["PyTorch", "IEEE Xplore", "ICASA", "Spatio-Temporal CNN-LSTM", "CUDA"],
    highlights: [
      "Funded by the Ministry of Earth Sciences (MoES), Government of India.",
      "Formulated novel deep learning architectures for spatio-temporal meteorological sequences.",
      "Peer-reviewed and published in IEEE Xplore digital library and presented at ICASA.",
      "Benchmarked on high-dimensional multi-spectral sensor arrays with strict empirical rigor."
    ],
    architectureNotes: "End-to-end differentiable spatio-temporal neural network with custom temporal loss formulations.",
    metrics: ["IEEE Indexed", "MoES Grant Funded", "Peer-Reviewed"]
  }
];

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  onOpenRagWithTopic,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("marketpulse-ai");

  if (!isOpen) return null;

  const selectedProject = FEATURED_PROJECTS.find((p) => p.id === selectedProjectId) || FEATURED_PROJECTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-3xl glass-panel text-white shadow-2xl border border-white/20 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base sm:text-xl text-white">
                  Dilip's AI &amp; Backend Projects
                </h2>
                <span className="hidden xs:inline px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Production-Grade
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[200px] sm:max-w-none">
                Architectural breakdowns for MarketPulse AI, Redwood Inference, and Research
              </p>
            </div>
          </div>

          <button
            id="projects-modal-close-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl glass-panel-subtle hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selector Tabs */}
        <div className="flex items-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 bg-black/20 overflow-x-auto ios-scroll shrink-0">
          {FEATURED_PROJECTS.map((proj) => (
            <button
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedProjectId === proj.id
                  ? "bg-white text-[#111927] font-semibold shadow-lg"
                  : "glass-panel-subtle text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>{proj.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                selectedProjectId === proj.id
                  ? "bg-slate-200 text-slate-800"
                  : "bg-white/10 text-slate-400"
              }`}>
                {proj.category}
              </span>
            </button>
          ))}
        </div>

        {/* Project Details Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 ios-scroll">
          
          {/* Top Banner */}
          <div className="p-5 rounded-2xl glass-panel-subtle border border-white/15 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {selectedProject.category}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
                  {selectedProject.title}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{selectedProject.tagline}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenRagWithTopic(`Explain the architecture and technical design of ${selectedProject.title}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/20 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ask RAG About This</span>
                </button>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedProject.metrics.map((metric, mIdx) => (
                <span
                  key={mIdx}
                  className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-emerald-300"
                >
                  ⚡ {metric}
                </span>
              ))}
            </div>
          </div>

          {/* Architecture Notes & Key Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Key Engineering Highlights */}
            <div className="p-5 rounded-2xl glass-panel-subtle border border-white/10 space-y-3">
              <h4 className="font-display font-semibold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> Key Engineering Highlights
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                {selectedProject.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Architecture & Tech Stack */}
            <div className="p-5 rounded-2xl glass-panel-subtle border border-white/10 space-y-3">
              <h4 className="font-display font-semibold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> System Architecture &amp; Stack
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {selectedProject.architectureNotes}
              </p>

              <div className="pt-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">Technologies Used:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.stack.map((stk, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-slate-200 font-mono"
                    >
                      {stk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Want to see live benchmarks or code walkthroughs? Ask Dilip's RAG Assistant.
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenRagWithTopic(`Give me a deep dive into ${selectedProject.title}`);
            }}
            className="px-4 py-2 rounded-xl bg-white text-[#111927] hover:bg-slate-100 font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Launch Interactive Q&amp;A
          </button>
        </div>

      </div>
    </div>
  );
};
