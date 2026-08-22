import React, { useState, useEffect, useRef } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
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
    streamIndexRef.current = 0;
    setDisplayedBio("");
    setIsStreaming(true);

    const streamNextChar = () => {
      if (streamIndexRef.current < FULL_BIO_TEXT.length) {
        const nextIndex = streamIndexRef.current + 1;
        streamIndexRef.current = nextIndex;
        setDisplayedBio(FULL_BIO_TEXT.slice(0, nextIndex));

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
      
      {/* 1. Main Headline (H1) with BLINK-Style font from Capture.PNG & fixed 2-line layout — Animates in from bottom to up after 2.0s */}
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

      {/* 2. Bio Section with Smooth Text Streaming, 76% Glassmorphism Transparency, Roboto font & Bright Orange-Yellow Looping Perimeter Beam */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 2.15, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 sm:mt-8 max-w-3xl w-full mx-auto px-1 sm:px-0"
      >
        <div className="relative rounded-2xl p-[1px] shadow-2xl shadow-amber-950/40">
          
          {/* Constant-speed perimeter SVG beam moving seamlessly around rectangle */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl z-20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="beamGradientOrangeYellow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="35%" stopColor="#ea580c" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="90%" stopColor="#fde047" stopOpacity="1" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0.2" />
              </linearGradient>
              <filter id="beamGlowOrangeYellow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
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

            {/* Seamless constant-speed looping glowing line path in Bright Orange-Yellow */}
            <rect
              pathLength="1000"
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="16"
              ry="16"
              fill="none"
              stroke="url(#beamGradientOrangeYellow)"
              strokeWidth="2.2"
              filter="url(#beamGlowOrangeYellow)"
              className="animate-border-beam"
            />
          </svg>

          {/* 76% Transparency Frosted Glass Canvas with Roboto typography and live token streaming cursor */}
          <div className="relative z-10 rounded-2xl p-5 sm:p-7 bg-white/[0.07] hover:bg-white/[0.09] backdrop-blur-xl border border-white/10 text-left transition-all duration-300 min-h-[140px] sm:min-h-[125px]">
            <p className="font-['Roboto',sans-serif] text-[14.5px] sm:text-[16px] md:text-[16.5px] text-slate-100 leading-[1.8] font-normal tracking-normal select-text">
              {displayedBio}
              {isStreaming && (
                <span className="inline-block w-[2.5px] h-[1.15em] bg-gradient-to-b from-amber-300 via-orange-400 to-yellow-200 ml-1 translate-y-[2px] shadow-[0_0_8px_#f59e0b] animate-cursor-blink" />
              )}
            </p>
          </div>

        </div>
      </motion.div>

      {/* 3. Call-to-Action Action Bar with Bottom-to-Up 1s Staggered Motion & Fade Effect */}
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
          className="group relative flex items-center justify-center gap-3 pl-6 pr-2.5 py-2.5 sm:py-3 min-h-[44px] rounded-full bg-white text-[#0e1626] font-semibold text-xs sm:text-sm tracking-tight shadow-xl shadow-black/40 hover:shadow-[0_10px_35px_rgba(255,255,255,0.3)] transition-all duration-300 cursor-pointer"
        >
          <span className="font-semibold text-slate-900 group-hover:text-black transition-colors">
            View My AI Projects
          </span>
          <div className="w-8 h-8 rounded-full bg-[#0e1626] text-white flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-black transition-all duration-200 shadow-sm shrink-0">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </motion.button>

        {/* Secondary Button: Enterprise RAG Agent */}
        <motion.button
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          id="hero-rag-cta"
          onClick={() => onOpenRag()}
          className="group relative flex items-center justify-center px-6 py-3 min-h-[44px] rounded-full bg-white/[0.07] border border-white/20 hover:border-amber-400/40 hover:bg-white/15 font-semibold text-xs sm:text-sm tracking-tight text-slate-200 hover:text-white backdrop-blur-md shadow-lg shadow-black/30 transition-all duration-300 cursor-pointer"
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
          className="group relative flex items-center justify-center px-6 py-3 min-h-[44px] rounded-full bg-transparent border border-white/25 hover:border-white/60 hover:bg-white/10 font-semibold text-xs sm:text-sm tracking-tight text-slate-200 hover:text-white backdrop-blur-md shadow-lg shadow-black/30 transition-all duration-300"
          title="Dilip's GitHub Profile"
        >
          <span>GitHub</span>
        </motion.a>
      </motion.div>

    </div>
  );
};
