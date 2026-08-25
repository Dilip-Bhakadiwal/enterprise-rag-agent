import React, { useState, useEffect } from "react";
import { ArrowUpRight, Award, Crown } from "lucide-react";
import { fetchLiveHeroStats, HeroStats } from "../services/api";

interface HeroContentProps {
  onOpenProjects: () => void;
  onOpenRag: (prompt?: string) => void;
}

const CIPHER_GLYPHS = '!<>-_\\/[]{}?"=+*^?#________0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const GlitchHeadline: React.FC = () => {
  const [line1, setLine1] = useState("ARCHITECT.");
  const [line2, setLine2] = useState("ORCHESTRATE.");
  const [line3, setLine3] = useState("DEPLOY.");
  const [isGlitching, setIsGlitching] = useState(false);

  const triggerGlitchSpike = () => {
    setIsGlitching(true);
    setTimeout(() => {
      setIsGlitching(false);
    }, 140);
  };

  // Initial Cipher text decryption reveal + periodic glitch
  useEffect(() => {
    const target1 = "ARCHITECT.";
    const target2 = "ORCHESTRATE.";
    const target3 = "DEPLOY.";

    let frame = 0;
    const totalFrames = 35;

    triggerGlitchSpike();

    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);

      // Decrypt line 1
      const chars1 = Math.floor(progress * target1.length);
      let s1 = "";
      for (let i = 0; i < target1.length; i++) {
        s1 += i < chars1 ? target1[i] : CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
      }
      setLine1(s1);

      // Decrypt line 2 (delayed)
      if (progress > 0.2) {
        const p2 = (progress - 0.2) / 0.8;
        const chars2 = Math.floor(p2 * target2.length);
        let s2 = "";
        for (let i = 0; i < target2.length; i++) {
          s2 += i < chars2 ? target2[i] : CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
        }
        setLine2(s2);
      }

      // Decrypt line 3 (delayed further)
      if (progress > 0.4) {
        const p3 = (progress - 0.4) / 0.6;
        const chars3 = Math.floor(p3 * target3.length);
        let s3 = "";
        for (let i = 0; i < target3.length; i++) {
          s3 += i < chars3 ? target3[i] : CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
        }
        setLine3(s3);
      }

      if (progress >= 1) {
        clearInterval(interval);
        setLine1(target1);
        setLine2(target2);
        setLine3(target3);
        triggerGlitchSpike();
      }
    }, 32);

    // Periodic procedural glitch spike
    const loopInterval = setInterval(() => {
      triggerGlitchSpike();
    }, 3800);

    return () => {
      clearInterval(interval);
      clearInterval(loopInterval);
    };
  }, []);

  return (
    <div
      onClick={triggerGlitchSpike}
      className={`relative cursor-pointer select-none font-podium uppercase leading-[0.92] tracking-tight text-[clamp(2.2rem,6.2vw,5.75rem)] animate-fade-up-delay-1 mb-2 transition-transform ${
        isGlitching ? "scale-[1.01]" : "scale-100"
      }`}
      title="Click to trigger glitch spike"
    >
      {/* 1. Crisp White Base Layer */}
      <div className="relative z-10 text-white">
        <div className="block">{line1}</div>
        <div className="block">{line2}</div>
        <div className="block">{line3}</div>
      </div>

      {/* 2. Optical Cyan Split Pass during Glitch */}
      {isGlitching && (
        <div
          aria-hidden="true"
          className="glitch-channel-cyan absolute inset-0 text-[#00f0ff] pointer-events-none z-0 select-none"
        >
          <div className="block">{line1}</div>
          <div className="block">{line2}</div>
          <div className="block">{line3}</div>
        </div>
      )}

      {/* 3. Optical Magenta Split Pass during Glitch */}
      {isGlitching && (
        <div
          aria-hidden="true"
          className="glitch-channel-magenta absolute inset-0 text-[#ff0055] pointer-events-none z-0 select-none"
        >
          <div className="block">{line1}</div>
          <div className="block">{line2}</div>
          <div className="block">{line3}</div>
        </div>
      )}
    </div>
  );
};

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
    <div className="relative z-20 flex-1 flex flex-col justify-center px-5 sm:px-10 lg:px-16 w-full items-start text-left pt-5 sm:pt-7 lg:pt-8 pb-5 sm:pb-6 my-auto max-w-7xl">
      
      {/* 1. Tagline: Crown icon + tracked uppercase text (animate-fade-up, 0s delay) */}
      <div className="animate-fade-up flex items-center gap-2 mb-2 sm:mb-2.5">
        <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD166] shrink-0" />
        <span className="text-white/70 text-[10px] sm:text-xs md:text-sm font-inter tracking-[0.22em] sm:tracking-[0.3em] uppercase font-medium">
          Production-Grade Agentic AI &amp; Backend Systems
        </span>
      </div>

      {/* 2. Glitch Heading */}
      <GlitchHeadline />

      {/* 3. Subtext: max-w-md with bold ending (animate-fade-up-delay-2, 0.4s delay) */}
      <p className="animate-fade-up-delay-2 text-white/70 text-xs sm:text-sm font-inter leading-relaxed max-w-md mt-2 sm:mt-2.5 select-text">
        We engineer multi-agent workflows and sub-second enterprise retrieval pipelines —{" "}
        <strong className="text-white font-bold">that scale to production.</strong>
      </p>

      {/* 4. CTA Row: Side-by-side on mobile, plus Award badge on desktop */}
      <div className="animate-fade-up-delay-3 mt-3.5 sm:mt-5 flex flex-wrap items-center gap-3 sm:gap-5 w-full">
        {/* Primary CTA: CHAT WITH RAG AGENT */}
        <button
          id="hero-rag-cta"
          onClick={() => onOpenRag()}
          className="group flex items-center gap-2 sm:gap-2.5 bg-black hover:bg-neutral-900 border border-white/20 hover:border-[#FF9F1C]/70 hover:shadow-[0_0_30px_rgba(255,159,28,0.3)] px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
        >
          <span>Chat with RAG Agent</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </button>

        {/* Secondary CTA: VIEW PROJECTS */}
        <button
          onClick={onOpenProjects}
          className="group flex items-center gap-2 border border-white/25 hover:border-white/60 hover:bg-white/10 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
        >
          <span>View Projects</span>
        </button>

        {/* Award Badge beside button (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-white/15">
          <Award className="w-6 h-6 text-[#FFD166]/80 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-white/80 font-inter text-[11px] tracking-wider uppercase font-semibold">
              M.Tech AI
            </span>
            <span className="text-white/50 font-inter text-[10px] tracking-wider uppercase">
              DIAT (DRDO) • IEEE Researcher
            </span>
          </div>
        </div>
      </div>

      {/* 5. Stats Row: Clean 2-column grid on mobile, flex-nowrap on desktop */}
      <div className="animate-fade-up-delay-4 mt-5 sm:mt-7 lg:mt-8 grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row lg:items-start gap-x-5 sm:gap-x-8 lg:gap-10 xl:gap-14 gap-y-3 sm:gap-y-4 w-full">
        {/* Stat 1: Neo4j Knowledge Graph */}
        <div className="flex flex-col text-left shrink-0">
          <span className="font-inter text-white text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight whitespace-nowrap">
            {stats.graph_nodes || 286}
          </span>
          <span className="text-white/60 font-inter text-[10px] sm:text-[11px] tracking-widest uppercase mt-1 flex items-center gap-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Graph Nodes (Neo4j)
          </span>
        </div>

        {/* Stat 2: Pinecone Vectors */}
        <div className="flex flex-col text-left shrink-0">
          <span className="font-inter text-white text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight whitespace-nowrap">
            {stats.vectors_indexed}
          </span>
          <span className="text-white/50 font-inter text-[10px] sm:text-[11px] tracking-widest uppercase mt-1 whitespace-nowrap">
            Vectors (Pinecone)
          </span>
        </div>

        {/* Stat 3: Agentic Latency */}
        <div className="flex flex-col text-left shrink-0">
          <span className="font-inter text-white text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight whitespace-nowrap">
            {stats.latency_display}
          </span>
          <span className="text-white/50 font-inter text-[10px] sm:text-[11px] tracking-widest uppercase mt-1 whitespace-nowrap">
            Agentic Latency
          </span>
        </div>

        {/* Stat 4: Failover Ladder */}
        <div className="flex flex-col text-left shrink-0">
          <span className="font-inter text-white text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight whitespace-nowrap">
            {stats.failover_tier || "3-Tier"}
          </span>
          <span className="text-white/50 font-inter text-[10px] sm:text-[11px] tracking-widest uppercase mt-1 whitespace-nowrap">
            Failover (Groq / OpenRouter)
          </span>
        </div>

        {/* Stat 5: Research */}
        <div className="flex flex-col text-left col-span-2 sm:col-span-1 pt-1 sm:pt-0 border-t border-white/10 sm:border-t-0 shrink-0">
          <span className="font-inter text-[#FFD166] sm:text-white text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight whitespace-nowrap">
            IEEE
          </span>
          <span className="text-white/60 sm:text-white/50 font-inter text-[10px] sm:text-[11px] tracking-widest uppercase mt-1 whitespace-nowrap">
            Published Research (MoES)
          </span>
        </div>
      </div>

    </div>
  );
};
