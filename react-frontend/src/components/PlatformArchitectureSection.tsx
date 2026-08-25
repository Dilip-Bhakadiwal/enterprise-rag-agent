import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Network, Database, Cpu, XCircle, CheckCircle2 } from "lucide-react";

interface EngineCardProps {
  id: string;
  engineNum: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  index: number;
}

function EngineCard({ id, engineNum, name, label, icon }: EngineCardProps) {
  return (
    <div
      id={id}
      className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-5 sm:p-6 flex flex-col items-center text-center group hover:border-[#2a2a2a] transition-all duration-300 w-[82vw] sm:w-[280px] md:w-auto shrink-0 snap-center rounded-2xl md:rounded-none"
    >
      {/* Corner Ticks */}
      <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-500/80 pointer-events-none" />
      <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-500/80 pointer-events-none" />
      <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-zinc-500/80 pointer-events-none" />
      <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-zinc-500/80 pointer-events-none" />

      {/* Green Accent Icon with subtle hover glow */}
      <div className="mb-3 flex items-center justify-center text-[#5fe323] p-2.5 rounded-lg bg-white/[0.03] group-hover:scale-105 transition-transform duration-300">
        {icon}
      </div>

      {/* Engine Number Tag */}
      <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#5fe323] mb-1.5 font-medium">
        {engineNum}
      </div>

      {/* Engine Name */}
      <div className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight mb-2">
        {name}
      </div>

      {/* Monospace Sub-label */}
      <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#71717a] font-normal max-w-[190px]">
        {label}
      </div>
    </div>
  );
}

export const PlatformArchitectureSection: React.FC = () => {
  const [activeEngineIdx, setActiveEngineIdx] = useState(0);
  const enginesScrollRef = useRef<HTMLDivElement>(null);

  const engines = [
    {
      id: "engine-neo4j",
      engineNum: "ENGINE // 01",
      name: "Neo4j AuraDB",
      label: "RELATIONAL & AGGREGATIONS",
      icon: <Network className="w-5 h-5 text-[#5fe323]" />,
    },
    {
      id: "engine-pinecone",
      engineNum: "ENGINE // 02",
      name: "Pinecone Vector DB",
      label: "1024-DIM NVIDIA NIM EMBEDDINGS",
      icon: <Database className="w-5 h-5 text-[#5fe323]" />,
    },
    {
      id: "engine-groq",
      engineNum: "ENGINE // 03",
      name: "Groq LPU + LangGraph",
      label: "SELF-CORRECTING INFERENCE ROUTER",
      icon: <Cpu className="w-5 h-5 text-[#5fe323]" />,
    },
  ];

  const handleEngineScroll = () => {
    if (enginesScrollRef.current) {
      const { scrollLeft, offsetWidth } = enginesScrollRef.current;
      const index = Math.round(scrollLeft / (offsetWidth * 0.82));
      setActiveEngineIdx(Math.min(Math.max(index, 0), engines.length - 1));
    }
  };

  const scrollEngineTo = (index: number) => {
    if (enginesScrollRef.current) {
      const cardWidth = enginesScrollRef.current.offsetWidth * 0.85;
      enginesScrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
      setActiveEngineIdx(index);
    }
  };

  return (
    <section
      id="what-is-nexora"
      className="w-full bg-black text-white flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 selection:bg-[#5fe323] selection:text-black font-sans border-t border-white/5 relative z-20 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-gradient-to-r from-emerald-500/5 via-[#5fe323]/5 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center relative z-10">
        {/* Top Tag / Eyebrow with Scroll Reveal */}
        <motion.div
          id="telemetry-tag"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-[#5fe323] font-medium mb-2.5 sm:mb-3 text-center"
        >
          // NEXT-GEN HYBRID GRAPHRAG
        </motion.div>

        {/* Main Headline with Scroll Reveal */}
        <motion.h2
          id="main-headline"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[1.75rem] sm:text-[2.65rem] md:text-5xl lg:text-[3.5rem] font-normal tracking-tight text-center leading-[1.14] text-white max-w-4xl"
        >
          What is <span className="font-semibold">Nexora AI</span>? <br />
          Enterprise <span className="text-[#5fe323]">Multi-Hop Intelligence</span>
        </motion.h2>

        {/* Description / Subtext with Scroll Reveal */}
        <motion.p
          id="description-text"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-mono text-[10px] sm:text-xs uppercase text-[#737373] tracking-[0.16em] leading-[1.6] text-center max-w-2xl mt-2.5 sm:mt-3.5 mb-8 sm:mb-10"
        >
          COMBINING DETERMINISTIC GRAPH TRAVERSAL WITH SEMANTIC VECTOR SEARCH.
        </motion.p>

        {/* 3-Engine Architecture Triad: Horizontal Snap-Rail on Mobile, 3-Col Grid on Desktop */}
        <div
          ref={enginesScrollRef}
          onScroll={handleEngineScroll}
          id="engines-grid"
          className="w-full flex md:grid md:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5 mb-5 md:mb-10 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none px-4 -mx-4 md:px-0 md:mx-0 touch-pan-x"
        >
          {engines.map((engine, idx) => (
            <EngineCard
              key={engine.id}
              id={engine.id}
              engineNum={engine.engineNum}
              name={engine.name}
              label={engine.label}
              icon={engine.icon}
              index={idx}
            />
          ))}
        </div>

        {/* Mobile Swipe Pagination Dots for Engines */}
        <div className="flex md:hidden items-center justify-center gap-2 mb-6">
          {engines.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollEngineTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeEngineIdx === idx ? "w-5 bg-[#5fe323]" : "w-1.5 bg-white/20"
              }`}
              aria-label={`Go to engine ${idx + 1}`}
            />
          ))}
        </div>

        {/* Minimal Side-by-Side Comparison Cards with Scroll Reveal */}
        <div
          id="comparison-grid"
          className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
        >
          {/* Standard Vector RAG */}
          <motion.div
            id="card-standard-rag"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-5 sm:p-7 flex flex-col justify-between group hover:border-[#2a2a2a] transition-all duration-300 rounded-2xl md:rounded-none"
          >
            {/* Corner Ticks */}
            <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-zinc-500/80 pointer-events-none" />

            <div>
              {/* Category Tag */}
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#71717a] mb-2 font-medium">
                TRADITIONAL // APPROACH
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4">
                Standard Vector RAG
              </h3>

              {/* Feature List */}
              <ul className="space-y-3 font-mono text-[11px] sm:text-xs text-[#a1a1aa] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500/80 shrink-0 mt-0.5" />
                  <span>Unstructured chunks with zero relationship awareness</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500/80 shrink-0 mt-0.5" />
                  <span>Hallucinates cross-entity mathematical sums &amp; sales numbers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500/80 shrink-0 mt-0.5" />
                  <span>Blind to multi-hop store hierarchies &amp; product SKU links</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-[#1a1a1a] font-mono text-[10px] sm:text-[11px] text-[#71717a]">
              PRECISION // ~62% ON COMPLEX AGGREGATIONS
            </div>
          </motion.div>

          {/* Nexora AI Multi-Hop */}
          <motion.div
            id="card-nexora-rag"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-5 sm:p-7 flex flex-col justify-between group hover:border-[#5fe323]/30 transition-all duration-300 rounded-2xl md:rounded-none"
          >
            {/* Corner Ticks */}
            <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-[#5fe323] pointer-events-none" />
            <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-[#5fe323] pointer-events-none" />
            <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-[#5fe323] pointer-events-none" />
            <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-[#5fe323] pointer-events-none" />

            <div>
              {/* Category Tag */}
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#5fe323] mb-2 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5fe323] animate-pulse"></span>
                <span>ENTERPRISE // NEXORA AI</span>
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4">
                Multi-Hop Hybrid GraphRAG
              </h3>

              {/* Feature List */}
              <ul className="space-y-3 font-mono text-[11px] sm:text-xs text-zinc-200 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5fe323] shrink-0 mt-0.5" />
                  <span>Deterministic Cypher graph queries for 100% mathematical accuracy</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5fe323] shrink-0 mt-0.5" />
                  <span>Multi-hop relationship reasoning across Apple &amp; Samsung datasets</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5fe323] shrink-0 mt-0.5" />
                  <span>Self-correcting LangGraph routing with sub-second failovers</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-[#1a1a1a] font-mono text-[10px] sm:text-[11px] text-[#5fe323] font-semibold">
              PRECISION // 99.4% DETERMINISTIC RECALL
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
