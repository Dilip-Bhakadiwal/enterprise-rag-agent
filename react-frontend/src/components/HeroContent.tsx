import React, { useState, useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

interface HeroContentProps {
  onOpenProjects: () => void;
  onOpenRag: (prompt?: string) => void;
}

const FULL_BIO_TEXT =
  "I am an AI Engineer specializing in Agentic AI, large language model (LLM) orchestration, and scalable backend infrastructure. My focus is on designing robust cloud pipelines and advanced data retrieval systems to build automated, production-ready AI applications. I am deeply passionate about pushing the boundaries of intelligent workflows and continuously exploring the latest advancements in artificial intelligence to solve complex engineering challenges.";

export const HeroContent: React.FC<HeroContentProps> = ({ onOpenProjects, onOpenRag }) => {
  const [displayedBio, setDisplayedBio] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const streamIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Smooth, readable human-paced streaming engine for AI Bio
  useEffect(() => {
    const streamNextChar = () => {
      if (streamIndexRef.current < FULL_BIO_TEXT.length) {
        const nextIndex = streamIndexRef.current + 1;
        setDisplayedBio(FULL_BIO_TEXT.slice(0, nextIndex));
        streamIndexRef.current = nextIndex;

        const currentChar = FULL_BIO_TEXT[nextIndex - 1];
        
        let delay = 28;
        if (currentChar === ".") {
          delay = 200;
        } else if (currentChar === ",") {
          delay = 100;
        } else if (currentChar === " ") {
          delay = 32;
        }

        timerRef.current = window.setTimeout(streamNextChar, delay);
      } else {
        setIsStreaming(false);
      }
    };

    // Delay text streaming start until after background and card entrances complete (3.1s)
    timerRef.current = window.setTimeout(streamNextChar, 3100);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative z-20 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 md:pt-10 pb-6 sm:pb-8 max-w-5xl mx-auto w-full">
      
      {/* 1. Main Headline (H1) with BLINK-Style font & metallic gradient */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 2.0, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl mx-auto px-2"
      >
        <h1 className="font-blink-display text-2xl sm:text-4xl md:text-[48px] lg:text-[56px] xl:text-[62px] font-bold tracking-[-0.035em] leading-[1.12] text-white">
          <span className="block whitespace-normal md:whitespace-nowrap">
            <span className="hero-blink-gradient">Building Production-Grade Agentic</span>
          </span>
          <span className="block whitespace-normal md:whitespace-nowrap mt-1 sm:mt-1.5">
            <span className="hero-blink-gradient">Workflows &amp; Edge AI Systems.</span>
          </span>
        </h1>
      </motion.div>

      {/* 2. Bio Section with Warm Fireplace Perimeter Glow Beam & 76% Glass Transparency */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 2.15, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 sm:mt-8 max-w-3xl w-full mx-auto px-1 sm:px-0"
      >
        <div className="relative rounded-2xl p-[1px] shadow-2xl shadow-black/60">
          
          {/* Constant-speed perimeter SVG beam in Warm Amber / Fire Orange (#FF9F1C / #E67E22 / #FFD166) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl z-20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="beamGradientFireAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF9F1C" stopOpacity="0.1" />
                <stop offset="35%" stopColor="#E67E22" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#FF9F1C" stopOpacity="1" />
                <stop offset="90%" stopColor="#FFD166" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFEAA7" stopOpacity="0.2" />
              </linearGradient>
              <filter id="beamGlowFireAmber">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle base border */}
            <rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="16"
              ry="16"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />

            {/* Glowing animated line path in Warm Amber */}
            <rect
              pathLength="1000"
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="16"
              ry="16"
              fill="none"
              stroke="url(#beamGradientFireAmber)"
              strokeWidth="2.2"
              filter="url(#beamGlowFireAmber)"
              className="animate-border-beam"
            />
          </svg>

          {/* 76% Transparency Frosted Glass Canvas with warm typography */}
          <div className="relative z-10 rounded-2xl p-5 sm:p-7 bg-[#0b101b]/70 hover:bg-[#0b101b]/80 backdrop-blur-xl border border-white/10 text-left transition-all duration-300 min-h-[140px] sm:min-h-[125px]">
            <p className="font-['Roboto',sans-serif] text-[14.5px] sm:text-[16px] md:text-[16.5px] text-slate-100 leading-[1.8] font-normal tracking-normal select-text">
              {displayedBio}
              {isStreaming && (
                <span className="inline-block w-[2.5px] h-[1.15em] bg-gradient-to-b from-[#FFD166] via-[#FF9F1C] to-[#E67E22] ml-1 translate-y-[2px] shadow-[0_0_10px_#FF9F1C] animate-cursor-blink" />
              )}
            </p>
          </div>

        </div>
      </motion.div>

      {/* 3. Action Buttons with Warm Ambient Glow on Hover */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 2.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
      >
        {/* Primary Button: View My AI Projects */}
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          id="hero-primary-projects-btn"
          onClick={onOpenProjects}
          className="group relative flex items-center justify-center gap-3 pl-6 pr-2.5 py-2.5 sm:py-3 min-h-[44px] rounded-full bg-white text-[#090e18] font-semibold text-xs sm:text-sm tracking-tight shadow-xl shadow-black/50 hover:shadow-[0_0_35px_rgba(255,159,28,0.35)] transition-all duration-300 cursor-pointer"
        >
          <span className="font-semibold text-slate-950 group-hover:text-black transition-colors">
            View My AI Projects
          </span>
          <div className="w-8 h-8 rounded-full bg-[#090e18] text-white flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-black transition-all duration-200 shadow-sm shrink-0">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </motion.button>

        {/* Secondary Button: Enterprise RAG Agent */}
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          id="hero-rag-cta"
          onClick={() => onOpenRag()}
          className="group relative flex items-center justify-center px-6 py-3 min-h-[44px] rounded-full bg-white/[0.06] border border-white/20 hover:border-[#FF9F1C]/70 hover:bg-white/[0.12] hover:shadow-[0_0_30px_rgba(255,159,28,0.22)] font-semibold text-xs sm:text-sm tracking-tight text-slate-100 hover:text-white backdrop-blur-md shadow-lg shadow-black/30 transition-all duration-300 cursor-pointer"
        >
          <span>Chat with RAG Agent</span>
        </motion.button>

        {/* Secondary Button: GitHub */}
        <motion.a
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          id="hero-github-cta"
          href="https://github.com/Dilip-Bhakadiwal"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-center px-6 py-3 min-h-[44px] rounded-full bg-transparent border border-white/20 hover:border-[#00B4D8]/60 hover:bg-[#00B4D8]/10 hover:shadow-[0_0_25px_rgba(0,180,216,0.25)] font-semibold text-xs sm:text-sm tracking-tight text-slate-200 hover:text-white backdrop-blur-md shadow-lg shadow-black/30 transition-all duration-300"
          title="Dilip's GitHub Profile"
        >
          <span>GitHub</span>
        </motion.a>
      </motion.div>

    </div>
  );
};
