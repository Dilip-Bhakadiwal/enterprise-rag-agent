import React, { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProjectDetail } from "../types";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRagWithTopic: (topic: string) => void;
}

const FEATURED_PROJECTS: ProjectDetail[] = [
  {
    id: "nexora-ai",
    title: "Nexora AI",
    tagline: "Enterprise Multi-Agent RAG & Hybrid Knowledge Graph Architecture",
    category: "Enterprise RAG",
    stack: [
      "LangGraph",
      "Neo4j AuraDB",
      "Pinecone Serverless",
      "FastAPI",
      "Groq / Gemini 3.7",
      "FastEmbed",
      "Docker",
      "Pydantic v2"
    ],
    highlights: [
      "Engineered hybrid self-routing retrieval combining Neo4j graph entity traversal with Pinecone 1024-dim dense vectors.",
      "Built resilient 3-Tier failover orchestration across Gemini 3.7 Flash, Groq Llama 3.3 70B, and deterministic local heuristic fallback.",
      "Incorporated AST-level validation and schema guardrails, reducing LLM hallucinations by 64% with sub-180ms p95 latency.",
      "Interactive 30 FPS hardware-accelerated Knowledge Graph canvas rendering 476 nodes and 3,000+ relationships in real-time."
    ],
    architectureNotes: "Stateful LangGraph cyclic graph with deterministic tool routing, vector similarity scoring, graph entity extraction, and live token-streaming.",
    metrics: ["<200ms Latency", "61.5K+ Vectors", "476 Graph Nodes", "3-Tier Failover"]
  },
  {
    id: "edge-ai-vision",
    title: "Edge AI Acceleration",
    tagline: "Real-Time Quantized Object Detection on Xilinx FPGA & NVIDIA Jetson Orin",
    category: "Edge AI & Hardware",
    stack: [
      "PyTorch",
      "Xilinx FPGA",
      "NVIDIA Jetson Orin",
      "YOLOv8n",
      "CUDA",
      "INT8 Quantization",
      "LLaMA 1B"
    ],
    highlights: [
      "Engineered custom lightweight YOLOv8n architecture optimized for high-throughput embedded edge inference.",
      "Quantized models from FP32 to INT8 with custom acceleration on Xilinx FPGA hardware, achieving 13 FPS real-time speed.",
      "Benchmarked and evaluated on NVIDIA Jetson Orin (2048 CUDA cores), clocking 45 FPS real-time object detection.",
      "Integrated lightweight local LLaMA 1B model to synthesize contextual natural-language descriptions of detected objects."
    ],
    architectureNotes: "End-to-end edge pipeline with INT8 hardware quantization kernels, TensorRT acceleration, and localized edge LLM captioning.",
    metrics: ["45 FPS on Jetson", "INT8 FPGA Quantization", "2048 CUDA Cores", "Local 1B LLM"]
  },
  {
    id: "moes-geophysical-ai",
    title: "Focal-CBAM Research",
    tagline: "Deep Neural Attention Models for Underwater Environments (Funded by MoES, Govt. of India)",
    category: "Published Research",
    stack: [
      "PyTorch",
      "MoES Grant",
      "IEEE Xplore",
      "ICASA 2025",
      "CUDA",
      "RUOD Dataset"
    ],
    highlights: [
      "Funded by the Ministry of Earth Sciences (MoES), Government of India.",
      "Formulated novel Focal-CBAM attention module enhancing feature discrimination in low-visibility, noisy underwater environments.",
      "Outperformed baseline YOLO architectures on underwater localization benchmarks across the RUOD dataset.",
      "Accepted for publication at the ICASA 2025 Conference with IEEE digital archiving."
    ],
    architectureNotes: "Novel spatial and channel attention mechanisms with custom modulated loss functions and multi-scale feature pyramids.",
    metrics: ["MoES Grant Funded", "ICASA 2025 Accepted", "IEEE Archived", "DIAT Research"]
  }
];

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  onOpenRagWithTopic,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("nexora-ai");

  const selectedProject =
    FEATURED_PROJECTS.find((p) => p.id === selectedProjectId) || FEATURED_PROJECTS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="projects-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ touchAction: "none", overscrollBehavior: "contain" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm font-inter select-none"
        >
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} aria-label="Close" />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-5xl max-h-[90dvh] flex flex-col rounded-3xl bg-[#060810] border border-white/15 text-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-black/50 shrink-0">
              <div>
                <h2 className="font-podium text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  Featured Systems &amp; Research
                </h2>
                <p className="text-xs text-white/50 tracking-wide mt-0.5">
                  Production Architectures by Dilip
                </p>
              </div>

              <button
                id="projects-modal-close-btn"
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/30 text-white/80 hover:text-white transition-all cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean Tab Bar */}
            <div className="flex items-center gap-6 px-6 sm:px-8 border-b border-white/10 bg-black/30 overflow-x-auto shrink-0">
              {FEATURED_PROJECTS.map((proj) => {
                const isActive = selectedProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`py-4 text-xs font-inter tracking-widest uppercase transition-all whitespace-nowrap cursor-pointer relative ${
                      isActive
                        ? "text-[#5fe323] font-bold"
                        : "text-white/60 hover:text-white font-medium"
                    }`}
                  >
                    <span>{proj.title}</span>
                    {isActive && (
                      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-[#5fe323]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Project Details Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Main Banner */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <h3 className="font-podium text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
                      {selectedProject.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                      {selectedProject.tagline}
                    </p>
                  </div>

                  {/* Ask RAG Assistant CTA */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenRagWithTopic(
                        `Explain the complete architecture and technical implementation of ${selectedProject.title}.`
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#5fe323] hover:bg-[#52c71f] active:bg-[#48b31a] text-black font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shrink-0 shadow-lg shadow-[#5fe323]/20"
                  >
                    Ask RAG Assistant
                  </button>
                </div>

                {/* Metrics Chips */}
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
                  {selectedProject.metrics.map((metric, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-[#5fe323] font-semibold tracking-wide"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2-Column Grid: Highlights & Architecture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Engineering Highlights */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3.5">
                  <h4 className="font-podium text-sm uppercase tracking-wider text-white">
                    Key Engineering Highlights
                  </h4>
                  <ul className="space-y-3 text-xs sm:text-[13px] text-white/80 leading-relaxed">
                    {selectedProject.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5fe323] mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Architecture & Tech Stack */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <h4 className="font-podium text-sm uppercase tracking-wider text-white">
                    System Architecture &amp; Stack
                  </h4>
                  <p className="text-xs sm:text-[13px] text-white/80 leading-relaxed">
                    {selectedProject.architectureNotes}
                  </p>

                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-2.5">
                      Technologies &amp; Frameworks:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.stack.map((stk, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/90 font-mono font-medium"
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
            <div className="px-6 sm:px-8 py-4 border-t border-white/10 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60 shrink-0">
              <div>
                Want to see live benchmarks or code walkthroughs? Ask Nexora Copilot.
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenRagWithTopic(`Give me a detailed deep dive into ${selectedProject.title}`);
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shrink-0"
              >
                Launch Interactive Q&amp;A
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
