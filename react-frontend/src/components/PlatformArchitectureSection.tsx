import React from "react";
import { Network, Database, Cpu, XCircle, CheckCircle2 } from "lucide-react";

interface EngineCardProps {
  id: string;
  engineNum: string;
  name: string;
  label: string;
  icon: React.ReactNode;
}

function EngineCard({ id, engineNum, name, label, icon }: EngineCardProps) {
  return (
    <div
      id={id}
      className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-6 sm:p-8 flex flex-col items-center text-center group hover:border-[#2a2a2a] transition-colors"
    >
      {/* Corner Ticks */}
      <span className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l border-zinc-500/80 pointer-events-none" />
      <span className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r border-zinc-500/80 pointer-events-none" />
      <span className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l border-zinc-500/80 pointer-events-none" />
      <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r border-zinc-500/80 pointer-events-none" />

      {/* Green Accent Icon */}
      <div className="mb-4 flex items-center justify-center text-[#5fe323]">
        {icon}
      </div>

      {/* Engine Number Tag */}
      <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#5fe323] mb-2 font-medium">
        {engineNum}
      </div>

      {/* Engine Name */}
      <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold text-white tracking-tight leading-tight mb-2.5">
        {name}
      </div>

      {/* Monospace Sub-label */}
      <div className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#71717a] font-normal max-w-[200px]">
        {label}
      </div>
    </div>
  );
}

export const PlatformArchitectureSection: React.FC = () => {
  const engines = [
    {
      id: "engine-neo4j",
      engineNum: "ENGINE // 01",
      name: "Neo4j AuraDB",
      label: "RELATIONAL & AGGREGATIONS",
      icon: <Network className="w-6 h-6 text-[#5fe323]" />,
    },
    {
      id: "engine-pinecone",
      engineNum: "ENGINE // 02",
      name: "Pinecone Vector DB",
      label: "1024-DIM NVIDIA NIM EMBEDDINGS",
      icon: <Database className="w-6 h-6 text-[#5fe323]" />,
    },
    {
      id: "engine-groq",
      engineNum: "ENGINE // 03",
      name: "Groq LPU + LangGraph",
      label: "SELF-CORRECTING INFERENCE ROUTER",
      icon: <Cpu className="w-6 h-6 text-[#5fe323]" />,
    },
  ];

  return (
    <section
      id="what-is-nexora"
      className="w-full bg-black text-white flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-20 sm:py-28 selection:bg-[#5fe323] selection:text-black font-sans border-t border-white/5 relative z-20"
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Top Tag / Eyebrow */}
        <div
          id="telemetry-tag"
          className="font-mono text-xs md:text-[13px] uppercase tracking-[0.28em] text-[#5fe323] font-medium mb-6 sm:mb-8 text-center"
        >
          // NEXT-GEN HYBRID GRAPHRAG
        </div>

        {/* Main Headline */}
        <h2
          id="main-headline"
          className="text-3xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-normal tracking-tight text-center leading-[1.12] text-white max-w-5xl"
        >
          What is <span className="font-semibold">Nexora AI</span>? <br />
          Enterprise <span className="text-[#5fe323]">Multi-Hop Intelligence</span>
        </h2>

        {/* Description / Subtext */}
        <p
          id="description-text"
          className="font-mono text-xs sm:text-[13px] uppercase text-[#737373] tracking-[0.16em] leading-[1.7] text-center max-w-2xl mt-6 sm:mt-8 mb-12 sm:mb-16"
        >
          COMBINING DETERMINISTIC GRAPH TRAVERSAL WITH SEMANTIC VECTOR SEARCH.
        </p>

        {/* 3-Engine Architecture Triad */}
        <div
          id="engines-grid"
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-12 sm:mb-16"
        >
          {engines.map((engine) => (
            <EngineCard
              key={engine.id}
              id={engine.id}
              engineNum={engine.engineNum}
              name={engine.name}
              label={engine.label}
              icon={engine.icon}
            />
          ))}
        </div>

        {/* Minimal Side-by-Side Comparison Cards */}
        <div
          id="comparison-grid"
          className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6"
        >
          {/* Standard Vector RAG */}
          <div
            id="card-standard-rag"
            className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-6 sm:p-10 flex flex-col justify-between group hover:border-[#2a2a2a] transition-colors"
          >
            {/* Corner Ticks */}
            <span className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r border-zinc-500/80 pointer-events-none" />

            <div>
              <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#71717a] mb-2 font-medium">
                TRADITIONAL APPROACH
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-6">
                Standard Vector RAG
              </h3>

              <div className="space-y-4 font-mono text-xs sm:text-[13px] text-[#a1a1aa] uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-500/80 shrink-0" />
                  <span>Fails at aggregations</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-500/80 shrink-0" />
                  <span>Hallucinates numbers</span>
                </div>
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 text-red-500/80 shrink-0" />
                  <span>Cannot link cross-dataset entities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nexora AI Hybrid GraphRAG */}
          <div
            id="card-nexora-rag"
            className="relative bg-[#0e0e0e] border border-[#1a1a1a] p-6 sm:p-10 flex flex-col justify-between group hover:border-[#2a2a2a] transition-colors"
          >
            {/* Corner Ticks */}
            <span className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l border-zinc-500/80 pointer-events-none" />
            <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r border-zinc-500/80 pointer-events-none" />

            <div>
              <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#5fe323] mb-2 font-medium">
                ZERO-HALLUCINATION ENGINE
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-6">
                Nexora AI Hybrid GraphRAG
              </h3>

              <div className="space-y-4 font-mono text-xs sm:text-[13px] text-zinc-200 uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#5fe323] shrink-0" />
                  <span>Deterministic Cypher queries</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#5fe323] shrink-0" />
                  <span>0% hallucination on metrics</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#5fe323] shrink-0" />
                  <span>Multi-hop cross-domain reasoning</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
