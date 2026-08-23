import React from "react";
import { X, ArrowUpRight } from "lucide-react";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRag: (prompt?: string) => void;
  onOpenProjects: () => void;
  onOpenResume: () => void;
}

export const MobileMenuOverlay: React.FC<MobileMenuOverlayProps> = ({
  isOpen,
  onClose,
  onOpenRag,
  onOpenProjects,
  onOpenResume,
}) => {
  const navItems = [
    { label: "RAG Agent", action: () => { onClose(); onOpenRag(); } },
    { label: "Projects", action: () => { onClose(); onOpenProjects(); } },
    { label: "Research", action: () => { onClose(); onOpenRag("What research has Dilip published with MoES funding?"); } },
    { label: "Resume", action: () => { onClose(); onOpenResume(); } },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between px-6 sm:px-10 py-5 lg:py-7 transition-all duration-500 ${
        isOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
      }`}
    >
      {/* Header row matches navbar: brand name on left, X close icon on right */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <img
            src={dilipLogo}
            alt="Logo"
            className="w-6 h-6 object-contain rounded-md border border-white/20"
          />
          <span className="font-podium text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
            DILIP BHAKADIWAL
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Centered vertically: 4 nav links in font-podium with staggered transitions */}
      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 my-auto">
        {navItems.map((item, i) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              transitionDelay: `${i * 80 + 100}ms`,
              transform: isOpen ? "translateY(0)" : "translateY(20px)",
              opacity: isOpen ? 1 : 0,
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="font-podium text-4xl sm:text-5xl text-white hover:text-[#FFD166] uppercase tracking-wider transition-colors cursor-pointer"
          >
            {item.label}
          </button>
        ))}

        {/* Action Button below links */}
        <div
          style={{
            transitionDelay: `${navItems.length * 80 + 100}ms`,
            transform: isOpen ? "translateY(0)" : "translateY(20px)",
            opacity: isOpen ? 1 : 0,
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="pt-4"
        >
          <button
            onClick={() => {
              onClose();
              onOpenRag();
            }}
            className="group flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-8 py-3.5 text-xs font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
          >
            <span>Chat with RAG</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Mobile Footer Meta */}
      <div className="text-center text-[11px] font-inter text-white/40 tracking-widest uppercase">
        M.Tech AI • DIAT (DRDO) • Enterprise RAG System
      </div>
    </div>
  );
};
