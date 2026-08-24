import React, { useState, useEffect } from "react";
import { HeroBackground } from "./components/HeroBackground";
import { Navbar } from "./components/Navbar";
import { MobileMenuOverlay } from "./components/MobileMenuOverlay";
import { HeroContent } from "./components/HeroContent";
import { PlatformArchitectureSection } from "./components/PlatformArchitectureSection";
import { DatasetCardsSection } from "./components/DatasetCardsSection";
import { RagChatPanel } from "./components/RagChatPanel";
import { ProjectsModal } from "./components/ProjectsModal";
import { ResumeModal } from "./components/ResumeModal";

export default function App() {
  const [isSiteLoaded, setIsSiteLoaded] = useState(false);
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ragInitialPrompt, setRagInitialPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    }
  }, []);

  const handleOpenRag = (prompt?: string) => {
    if (prompt) {
      setRagInitialPrompt(prompt);
    }
    setIsRagOpen(true);
  };

  const handleOpenProjects = () => {
    setIsProjectsModalOpen(true);
  };

  const handleOpenResume = () => {
    setIsResumeOpen(true);
  };

  const handleOpenRagWithTopic = (topic: string) => {
    setRagInitialPrompt(topic);
    setIsRagOpen(true);
  };

  const scrollToArchitecture = () => {
    document.getElementById("what-is-nexora")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white selection:bg-[#5fe323] selection:text-black font-inter scroll-smooth flex flex-col overflow-x-hidden">
      
      {/* ── HERO VIEWPORT (Fullscreen min-h-[100dvh]) ─────────────────────── */}
      <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-black">
        {/* Fullscreen Looping Background Video (Fades in over 2s first) */}
        <HeroBackground onLoaded={() => setIsSiteLoaded(true)} />

        {/* Top Header Navigation (Revealed after video loads) */}
        <div className={`transition-all duration-1000 ease-out z-30 ${
          isSiteLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}>
          <Navbar
            onOpenRag={() => handleOpenRag()}
            onOpenProjects={handleOpenProjects}
            onOpenResume={handleOpenResume}
            onToggleMenu={() => setIsMobileMenuOpen(true)}
          />
        </div>

        {/* Fullscreen Mobile Menu Overlay (below md) */}
        <MobileMenuOverlay
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenRag={handleOpenRag}
          onOpenProjects={handleOpenProjects}
          onOpenResume={handleOpenResume}
        />

        {/* Main Hero Viewport Content (Revealed after video loads) */}
        <main className={`relative z-20 flex-1 flex flex-col justify-center w-full transition-all duration-1000 ease-out ${
          isSiteLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
        }`}>
          <HeroContent
            onOpenProjects={handleOpenProjects}
            onOpenRag={handleOpenRag}
          />
        </main>

        {/* Scroll Indicator Button to Section 1 (Revealed after video loads) */}
        <div className={`relative z-20 pb-5 flex justify-center w-full transition-all duration-1000 ease-out ${
          isSiteLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <button
            onClick={scrollToArchitecture}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/90 border border-white/20 hover:border-[#5fe323] text-white/80 hover:text-white text-xs font-mono tracking-widest uppercase transition-all duration-300 cursor-pointer backdrop-blur-md shadow-lg"
            aria-label="Scroll to Platform Architecture"
          >
            <span>Explore Architecture &amp; Datasets</span>
            <span className="text-[#5fe323] group-hover:translate-y-0.5 transition-transform">↓</span>
          </button>
        </div>
      </div>

      {/* ── SECTIONS & COPILOT LAUNCHER (Smoothly revealed after video loads) ─── */}
      <div className={`transition-opacity duration-1000 ease-out ${
        isSiteLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}>
        {/* ── SECTION 1: WHAT IS NEXORA AI (Core Architecture & Triad) ───────── */}
        <PlatformArchitectureSection />

        {/* ── SECTION 2: CURATED ENTERPRISE DATASETS (card.txt template) ─────── */}
        <DatasetCardsSection onOpenRag={handleOpenRag} />
      </div>

      {/* ── INTERACTIVE MODALS & FLOATING LAUNCHER ─────────────────────────── */}
      {/* Glassmorphic RAG Portfolio Chat Panel */}
      <RagChatPanel
        isOpen={isRagOpen}
        onClose={() => {
          setIsRagOpen(false);
          setRagInitialPrompt(undefined);
        }}
        initialPrompt={ragInitialPrompt}
      />

      {/* Projects Showcase Modal */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        onOpenRagWithTopic={handleOpenRagWithTopic}
      />

      {/* Resume Modal */}
      <ResumeModal
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
      />

      {/* Floating Neon Green (#5fe323) AI Copilot Launcher Button */}
      {!isRagOpen && isSiteLoaded && (
        <button
          onClick={() => handleOpenRag()}
          aria-label="Open Nexora AI Copilot"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2 sm:gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full bg-[#5fe323] hover:bg-[#52c71f] active:bg-[#48b31a] text-black font-bold text-xs sm:text-sm shadow-2xl shadow-[#5fe323]/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/40 backdrop-blur-md select-none animate-in fade-in"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-black text-[#5fe323] text-[10px] sm:text-xs font-bold italic flex items-center justify-center shadow-xs">
            N
          </div>
          <span className="font-bold tracking-tight font-inter text-xs sm:text-sm text-black">Ask Copilot</span>
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black animate-pulse"></span>
        </button>
      )}
    </div>
  );
}
