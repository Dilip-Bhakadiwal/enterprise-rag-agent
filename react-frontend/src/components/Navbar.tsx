import React from "react";
import { Github, Linkedin, Mail } from "lucide-react";
import { motion } from "motion/react";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface NavbarProps {
  onOpenRag?: () => void;
  onOpenProjects?: () => void;
  onOpenResume?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenResume }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, delay: 2.0, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-40 w-full px-3.5 sm:px-8 lg:px-14 py-4 sm:py-6 max-w-7xl mx-auto flex items-center justify-between"
    >
      {/* Brand Mark with Dilip's Web App Logo and Name */}
      <div className="flex items-center">
        <button
          id="nav-brand-btn"
          onClick={onOpenResume}
          className="group flex items-center gap-2.5 text-white font-semibold hover:text-white transition-all duration-200 cursor-pointer py-1.5 min-h-[44px]"
          title="Dilip Bhakadiwal"
        >
          <img
            src={dilipLogo}
            alt="Dilip Bhakadiwal Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain border border-white/20 shadow-md group-hover:scale-105 group-hover:border-[#FF9F1C]/60 group-hover:shadow-[0_0_20px_rgba(255,159,28,0.3)] transition-all duration-300 shrink-0"
          />
          <span className="tracking-wide uppercase text-xs sm:text-base font-semibold text-slate-100 group-hover:text-[#FFD166] transition-colors whitespace-nowrap">
            Dilip Bhakadiwal
          </span>
        </button>
      </div>

      {/* Right Action Controls: GitHub, LinkedIn, Contact with Warm Hover Glow */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        <a
          id="nav-github-link"
          href="https://github.com/Dilip-Bhakadiwal"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/[0.05] border border-white/12 hover:border-[#FF9F1C]/50 hover:bg-white/[0.12] hover:shadow-[0_0_25px_rgba(255,159,28,0.2)] hover:scale-105 active:scale-95 text-slate-300 hover:text-white transition-all duration-200"
          title="Dilip's GitHub Profile"
          aria-label="GitHub Profile"
        >
          <Github className="w-4 h-4" />
        </a>

        <a
          id="nav-linkedin-link"
          href="https://linkedin.com/in/dilip-bhakadiwal"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/[0.05] border border-white/12 hover:border-[#00B4D8]/50 hover:bg-[#00B4D8]/10 hover:shadow-[0_0_25px_rgba(0,180,216,0.25)] hover:scale-105 active:scale-95 text-slate-300 hover:text-white transition-all duration-200"
          title="Dilip's LinkedIn Profile"
          aria-label="LinkedIn Profile"
        >
          <Linkedin className="w-4 h-4" />
        </a>

        <a
          id="nav-email-link"
          href="mailto:9828dilip@gmail.com"
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 min-h-[44px] rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 hover:border-[#FF9F1C]/60 hover:shadow-[0_0_25px_rgba(255,159,28,0.25)] text-white text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
          title="Contact Dilip directly at 9828dilip@gmail.com"
        >
          <Mail className="w-3.5 h-3.5 text-[#00B4D8] shrink-0" />
          <span className="hidden xs:inline sm:inline">Get in Touch</span>
          <span className="inline xs:hidden sm:hidden">Email</span>
        </a>
      </div>
    </motion.header>
  );
};
