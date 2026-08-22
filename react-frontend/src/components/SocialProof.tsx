import React from "react";
import { motion } from "motion/react";

export const SocialProof: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, delay: 2.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-8 mt-auto pt-4 sm:pt-6 pb-6 sm:pb-8"
      style={{
        paddingBottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))"
      }}
    >
      {/* Logos Strip with interactive hover effects matching reference image */}
      <div className="flex flex-wrap items-center justify-center gap-5 xs:gap-7 sm:gap-10 md:gap-14 lg:gap-16">
        
        {/* IEEE Xplore */}
        <div className="group flex items-center gap-2 text-slate-300/80 hover:text-white transition-all duration-300 cursor-default select-none">
          <div className="w-5 h-5 rounded bg-white/10 border border-white/20 flex items-center justify-center text-white font-mono text-[10px] font-bold group-hover:scale-105 group-hover:bg-white/20 transition-all">
            IE
          </div>
          <span className="font-display font-bold tracking-tight text-base sm:text-lg">
            IEEE Xplore
          </span>
        </div>

        {/* ICASA Research */}
        <div className="group flex items-center gap-2 text-slate-300/80 hover:text-white transition-all duration-300 cursor-default select-none">
          <span className="font-display font-extrabold text-base sm:text-lg tracking-tight">
            ICASA<span className="text-slate-400 group-hover:text-white/80 font-normal ml-1 text-sm">(MoES)</span>
          </span>
        </div>

        {/* LangGraph */}
        <div className="group flex items-center gap-2 text-slate-300/80 hover:text-white transition-all duration-300 cursor-default select-none">
          <svg className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6m0 6v6M3 12h6m6 0h6" />
          </svg>
          <span className="font-mono font-semibold text-base sm:text-lg tracking-tight">
            LangGraph
          </span>
        </div>

        {/* FastAPI */}
        <div className="group flex items-center gap-1.5 text-slate-300/80 hover:text-white transition-all duration-300 cursor-default select-none">
          <span className="text-slate-300 group-hover:text-white text-base">⚡</span>
          <span className="font-display font-extrabold text-base sm:text-lg tracking-tight">
            FastAPI
          </span>
        </div>

        {/* Pinecone */}
        <div className="group flex items-center gap-2 text-slate-300/80 hover:text-white transition-all duration-300 cursor-default select-none">
          <div className="w-3.5 h-3.5 bg-slate-300 group-hover:bg-white transform rotate-45 flex items-center justify-center transition-colors">
            <div className="w-1.5 h-1.5 bg-[#0b101b]" />
          </div>
          <span className="font-sans font-bold text-base sm:text-lg tracking-tight">
            Pinecone
          </span>
        </div>

      </div>
    </motion.div>
  );
};
