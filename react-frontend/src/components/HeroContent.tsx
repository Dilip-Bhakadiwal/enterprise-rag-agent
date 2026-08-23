import React, { useState, useEffect } from "react";
import { ArrowUpRight, Award, Crown } from "lucide-react";
import { fetchLiveHeroStats, HeroStats } from "../services/api";

interface HeroContentProps {
  onOpenProjects: () => void;
  onOpenRag: (prompt?: string) => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({
  onOpenProjects,
  onOpenRag,
}) => {
  const [stats, setStats] = useState<HeroStats>({
    vectors_indexed: "61.5K+",
    agentic_latency_ms: 180,
    latency_display: "<200ms",
    failover_tier: "3-Tier",
  });

  useEffect(() => {
    let isMounted = true;
    fetchLiveHeroStats().then((data) => {
      if (isMounted && data) {
        setStats(data);
      }
    });

    // Refresh every 15 minutes in background
    const interval = setInterval(() => {
      fetchLiveHeroStats().then((data) => {
        if (isMounted && data) {
          setStats(data);
        }
      });
    }, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative z-20 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 w-full items-start text-left my-auto">
      
      {/* 1. Tagline: Crown icon + tracked uppercase text (animate-fade-up, 0s delay) */}
      <div className="animate-fade-up flex items-center gap-2 mb-6 lg:mb-8">
        <Crown className="w-4 h-4 text-white/70 shrink-0 text-[#FFD166]" />
        <span className="text-white/70 text-xs sm:text-sm font-inter tracking-[0.3em] uppercase font-medium">
          Production-Grade Agentic AI &amp; Backend Systems
        </span>
      </div>

      {/* 2. Main Heading: 3 lines in font-podium with clamp sizing (animate-fade-up-delay-1, 0.2s delay) */}
      <div className="animate-fade-up-delay-1 font-podium text-white uppercase leading-[0.92] tracking-tight text-[clamp(2.8rem,8vw,7rem)] select-none">
        <div className="block">ARCHITECT.</div>
        <div className="block">ORCHESTRATE.</div>
        <div className="block">DEPLOY.</div>
      </div>

      {/* 3. Subtext: max-w-md with bold ending (animate-fade-up-delay-2, 0.4s delay) */}
      <p className="animate-fade-up-delay-2 text-white/70 text-sm sm:text-base font-inter leading-relaxed max-w-md mt-6 lg:mt-8 select-text">
        We engineer multi-agent workflows and sub-second enterprise retrieval pipelines —{" "}
        <strong className="text-white font-bold">that scale to production.</strong>
      </p>

      {/* 4. CTA Row: Black button + Award badge (animate-fade-up-delay-3, 0.6s delay) */}
      <div className="animate-fade-up-delay-3 mt-8 lg:mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Primary CTA: CHAT WITH RAG AGENT */}
        <button
          id="hero-rag-cta"
          onClick={() => onOpenRag()}
          className="group flex items-center gap-3 bg-black hover:bg-neutral-900 border border-white/20 hover:border-[#FF9F1C]/70 hover:shadow-[0_0_30px_rgba(255,159,28,0.3)] px-5 sm:px-7 py-3.5 sm:py-4 text-[11px] sm:text-xs font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
        >
          <span>Chat with RAG Agent</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </button>

        {/* Secondary CTA: VIEW PROJECTS */}
        <button
          onClick={onOpenProjects}
          className="group flex items-center gap-2 border border-white/25 hover:border-white/60 hover:bg-white/10 px-5 sm:px-6 py-3.5 sm:py-4 text-[11px] sm:text-xs font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
        >
          <span>View Projects</span>
        </button>

        {/* Award Badge beside button (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-white/15">
          <Award className="w-8 h-8 text-[#FFD166]/80 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-white/80 font-inter text-xs tracking-wider uppercase font-semibold">
              M.Tech AI
            </span>
            <span className="text-white/50 font-inter text-[11px] tracking-wider uppercase">
              DIAT (DRDO) • IEEE Researcher
            </span>
          </div>
        </div>
      </div>

      {/* 5. Stats Row: 5 dynamic stats with Knowledge Graph */}
      <div className="animate-fade-up-delay-4 mt-8 sm:mt-10 lg:mt-14 flex flex-wrap gap-6 sm:gap-10 lg:gap-14">
        {/* Stat 1: Neo4j Knowledge Graph */}
        <div className="flex flex-col text-left">
          <span className="font-inter text-emerald-400 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {stats.graph_nodes || 286}
          </span>
          <span className="text-white/60 font-inter text-[9px] sm:text-xs tracking-widest uppercase mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Graph Nodes (Neo4j Aura)
          </span>
        </div>

        {/* Stat 2: Pinecone Vectors */}
        <div className="flex flex-col text-left">
          <span className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {stats.vectors_indexed}
          </span>
          <span className="text-white/50 font-inter text-[9px] sm:text-xs tracking-widest uppercase mt-1">
            Vectors (Pinecone)
          </span>
        </div>

        {/* Stat 3: Agentic Latency */}
        <div className="flex flex-col text-left">
          <span className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {stats.latency_display}
          </span>
          <span className="text-white/50 font-inter text-[9px] sm:text-xs tracking-widest uppercase mt-1">
            Agentic Latency
          </span>
        </div>

        {/* Stat 4: Failover Ladder */}
        <div className="flex flex-col text-left">
          <span className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {stats.failover_tier || "3-Tier"}
          </span>
          <span className="text-white/50 font-inter text-[9px] sm:text-xs tracking-widest uppercase mt-1">
            Failover (Groq / OpenRouter)
          </span>
        </div>

        {/* Stat 5: Research */}
        <div className="flex flex-col text-left">
          <span className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            IEEE
          </span>
          <span className="text-white/50 font-inter text-[9px] sm:text-xs tracking-widest uppercase mt-1">
            Published Research (MoES)
          </span>
        </div>
      </div>

    </div>
  );
};
