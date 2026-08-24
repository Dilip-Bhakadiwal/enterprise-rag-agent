import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";

interface DatasetCardData {
  id: string;
  themeColor: string; // Background color class
  accentTextColor: string;
  title: string;
  metric1Label: string;
  metric1Value: string;
  metric2Label: string;
  metric2Value: string;
  coverageLabel: string;
  coverageItem1: string;
  coverageItem2: string;
  highlights: string[];
  sampleQuery: string;
}

interface DatasetCardsSectionProps {
  onOpenRag: (prompt?: string) => void;
}

export const DatasetCardsSection: React.FC<DatasetCardsSectionProps> = ({ onOpenRag }) => {
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const cardsScrollRef = useRef<HTMLDivElement>(null);

  const datasets: DatasetCardData[] = [
    {
      id: "apple-dataset",
      themeColor: "from-[#1e1b4b]/80 via-[#0f172a]/90 to-[#020617]", // Deep Indigo glass
      accentTextColor: "text-indigo-400",
      title: "Apple Global Retail & Warranty Intelligence",
      metric1Label: "Transaction Scale",
      metric1Value: "1,040,200",
      metric2Label: "Warranty Claims",
      metric2Value: "30,000",
      coverageLabel: "Coverage",
      coverageItem1: "89 Products",
      coverageItem2: "75 Stores",
      highlights: [
        "Sales volume & revenue tracking",
        "Deterministic price & claim aggregations",
        "Geographic store revenue distribution",
      ],
      sampleQuery: "Which Apple products recorded the highest warranty repair claims and what were their prices?",
    },
    {
      id: "samsung-dataset",
      themeColor: "from-[#064e3b]/80 via-[#0f172a]/90 to-[#020617]", // Deep Emerald glass
      accentTextColor: "text-emerald-400",
      title: "Samsung 5G Regional Market Telemetry",
      metric1Label: "Quarterly Records",
      metric1Value: "1,000",
      metric2Label: "Subscribers (5G)",
      metric2Value: "480M+ Users",
      coverageLabel: "Global Scope",
      coverageItem1: "6 Continents",
      coverageItem2: "2020 - 2024",
      highlights: [
        "Regional 5G speed & coverage analysis",
        "Quarterly revenue & market share trends",
        "Multi-hop cross-brand benchmark links",
      ],
      sampleQuery: "Compare Samsung 5G revenue in Europe against Apple retail store volume.",
    },
    {
      id: "research-dataset",
      themeColor: "from-[#312e81]/80 via-[#0f172a]/90 to-[#020617]", // Deep Slate glass
      accentTextColor: "text-sky-400",
      title: "Deep Learning Research & Systems Portfolio",
      metric1Label: "Vector Chunks",
      metric1Value: "239 Dense",
      metric2Label: "Embeddings",
      metric2Value: "1024-dim NIM",
      coverageLabel: "Research Domains",
      coverageItem1: "IEEE Xplore",
      coverageItem2: "MoES Funding",
      highlights: [
        "Focal-CBAM Fish-YOLO object detection",
        "Underwater attention mechanisms",
        "High-concurrency LangGraph architectures",
      ],
      sampleQuery: "What published research did Dilip work on with MoES funding?",
    },
  ];

  const handleCardScroll = () => {
    if (cardsScrollRef.current) {
      const { scrollLeft, offsetWidth } = cardsScrollRef.current;
      const index = Math.round(scrollLeft / (offsetWidth * 0.82));
      setActiveCardIdx(Math.min(Math.max(index, 0), datasets.length - 1));
    }
  };

  const scrollCardTo = (index: number) => {
    if (cardsScrollRef.current) {
      const cardWidth = cardsScrollRef.current.offsetWidth * 0.85;
      cardsScrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
      setActiveCardIdx(index);
    }
  };

  return (
    <section
      id="curated-datasets"
      className="w-full bg-black text-white flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-20 border-t border-white/5 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-emerald-500/5 via-sky-500/5 to-purple-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center relative z-10">
        {/* Section Tag with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs md:text-[13px] uppercase tracking-[0.28em] text-[#5fe323] font-medium mb-4 text-center"
        >
          // ENTERPRISE KNOWLEDGE BASE
        </motion.div>

        {/* Section Headline with Scroll Reveal */}
        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center text-white mb-4"
        >
          Curated <span className="text-[#5fe323]">Multi-Modal</span> Datasets
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-mono text-xs sm:text-[13px] uppercase text-[#8b949e] tracking-[0.16em] text-center max-w-2xl mb-10 sm:mb-16"
        >
          INDEXED FOR SUB-SECOND CYPHER GRAPH TRAVERSAL &amp; NVIDIA DENSE VECTOR RETRIEVAL.
        </motion.p>

        {/* 3 Dataset Cards Grid: Horizontal Snap-Rail on Mobile, 3-Col Grid on Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full"
        >
          <div
            ref={cardsScrollRef}
            onScroll={handleCardScroll}
            className="w-full flex md:grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 justify-items-center overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none px-4 -mx-4 md:px-0 md:mx-0 touch-pan-x mb-6 md:mb-0"
            style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
          >
            {datasets.map((ds) => (
              <div
                key={ds.id}
                className={`bg-gradient-to-b ${ds.themeColor} w-[84vw] max-w-[360px] md:w-full md:max-w-[375px] shrink-0 snap-center rounded-3xl overflow-hidden shadow-2xl pb-5 sm:pb-6 relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/90 border border-white/10 group`}
              >
                {/* Top ambient rim light */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                {/* Header Section */}
                <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-1.5">
                    DATASET // {ds.id.split("-")[0].toUpperCase()}
                  </div>
                  <h3 className="text-white text-base sm:text-lg font-semibold leading-tight min-h-[44px] sm:min-h-[50px]">
                    {ds.title}
                  </h3>
                </div>

                {/* Main Data Summary Container - Frosted Deep Slate Glass */}
                <div className="bg-[#12161f]/95 border border-white/10 rounded-2xl p-4 sm:p-5 mx-3.5 sm:mx-6 mb-4 sm:mb-5 shadow-inner text-slate-100 flex-1 flex flex-col justify-between backdrop-blur-md">
                  <div>
                    {/* Key Metrics */}
                    <div className="mb-3.5 sm:mb-4 border-b border-white/10 pb-3 sm:pb-4">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-zinc-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider mb-1">
                            {ds.metric1Label}
                          </p>
                          <p className="text-white font-bold text-sm sm:text-base font-mono tracking-tight">{ds.metric1Value}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider mb-1">
                            {ds.metric2Label}
                          </p>
                          <p className="text-white font-bold text-sm sm:text-base font-mono tracking-tight">{ds.metric2Value}</p>
                        </div>
                      </div>
                    </div>

                    {/* Coverage */}
                    <div className="border-b border-white/10 pb-3 sm:pb-4 mb-3 sm:mb-4">
                      <p className="text-zinc-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider mb-1.5">
                        {ds.coverageLabel}
                      </p>
                      <div className="flex items-center text-zinc-200 text-xs font-semibold">
                        <span className="mr-3 sm:mr-4 px-2 py-0.5 rounded bg-white/5 border border-white/10">{ds.coverageItem1}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{ds.coverageItem2}</span>
                      </div>
                    </div>

                    {/* Details / Highlights */}
                    <div>
                      <p className="text-zinc-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider mb-2">
                        Dataset Highlights
                      </p>
                      <ul className="text-xs text-zinc-300 space-y-1.5 leading-relaxed font-sans">
                        {ds.highlights.map((h, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-[#5fe323] font-bold mr-2 text-sm shrink-0">✓</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Quick Launch Action Button */}
                <div className="px-3.5 sm:px-6">
                  <button
                    onClick={() => onOpenRag(ds.sampleQuery)}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-[#5fe323] hover:text-black hover:border-[#5fe323] active:bg-[#48b31a] text-white font-mono text-xs tracking-wider uppercase py-2.5 sm:py-3 rounded-xl border border-white/20 transition-all duration-200 cursor-pointer shadow-sm group/btn min-h-[42px]"
                    title="Run sample query in Copilot"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#5fe323] group-hover/btn:text-black transition-colors" />
                    <span className="font-semibold">Test Sample Query</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mobile Swipe Pagination Dots for Datasets */}
        <div className="flex md:hidden items-center justify-center gap-2 mt-2">
          {datasets.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollCardTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeCardIdx === idx ? "w-6 bg-[#5fe323]" : "w-1.5 bg-white/20"
              }`}
              aria-label={`Go to dataset ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
