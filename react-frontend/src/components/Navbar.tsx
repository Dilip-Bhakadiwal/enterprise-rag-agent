import React from "react";
import { ArrowUpRight } from "lucide-react";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface NavbarProps {
  onOpenRag: (prompt?: string) => void;
  onOpenProjects: () => void;
  onOpenResume: () => void;
  onOpenGraph?: () => void;
  onToggleMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRag,
  onOpenProjects,
  onOpenResume,
  onOpenGraph,
  onToggleMenu,
}) => {
  return (
    <header className="relative z-40 w-full px-5 sm:px-10 lg:px-16 pt-5 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between">
      {/* Left: Brand name in font-podium with logo */}
      <div className="flex items-center">
        <button
          onClick={onOpenResume}
          className="group flex items-center gap-2 text-white cursor-pointer select-none text-left"
          title="Nexora AI"
        >
          <img
            src={dilipLogo}
            alt="Nexora Logo"
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded border border-white/20 shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0"
          />
          <span className="font-podium text-base sm:text-lg font-bold uppercase tracking-wider text-white group-hover:text-[#FFD166] transition-colors whitespace-nowrap">
            NEXORA AI
          </span>
        </button>
      </div>

      {/* Center: Nav links in font-inter (hidden below md) */}
      <nav className="hidden md:flex items-center gap-5 lg:gap-7">
        <button
          onClick={onOpenGraph}
          className="font-inter text-xs lg:text-[13px] text-white/80 tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
        >
          Knowledge Graph
        </button>
        <button
          onClick={onOpenProjects}
          className="font-inter text-xs lg:text-[13px] text-white/80 tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
        >
          Projects
        </button>
        <button
          onClick={() => onOpenRag("What research has Dilip published with MoES funding?")}
          className="font-inter text-xs lg:text-[13px] text-white/80 tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
        >
          Research
        </button>
        <button
          onClick={onOpenResume}
          className="font-inter text-xs lg:text-[13px] text-white/80 tracking-widest uppercase hover:text-white transition-colors cursor-pointer"
        >
          Resume
        </button>
      </nav>

      {/* Right: GET IN TOUCH button in font-inter (hidden below md) */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenResume}
          className="group flex items-center gap-1.5 border border-white/30 hover:border-white/60 hover:bg-white/10 px-4 py-2 text-[11px] font-inter tracking-widest uppercase text-white transition-all duration-300 cursor-pointer"
        >
          <span>Get in Touch</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </button>
      </div>

      {/* Right: 3-bar hamburger button (visible below md only) */}
      <button
        onClick={onToggleMenu}
        className="flex md:hidden flex-col items-end justify-center p-1.5 text-white cursor-pointer space-y-1.5"
        aria-label="Open mobile navigation menu"
      >
        <div className="w-5 h-0.5 bg-white transition-all" />
        <div className="w-5 h-0.5 bg-white transition-all" />
        <div className="w-3.5 h-0.5 bg-white transition-all" />
      </button>
    </header>
  );
};
