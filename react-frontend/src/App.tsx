import React, { useState } from "react";
import { HeroBackground } from "./components/HeroBackground";
import { Navbar } from "./components/Navbar";
import { MobileMenuOverlay } from "./components/MobileMenuOverlay";
import { HeroContent } from "./components/HeroContent";
import { RagChatPanel } from "./components/RagChatPanel";
import { ProjectsModal } from "./components/ProjectsModal";
import { ResumeModal } from "./components/ResumeModal";

export default function App() {
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [ragInitialPrompt, setRagInitialPrompt] = useState<string | undefined>(undefined);

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

  return (
    <div className="relative h-screen min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#080c14] text-white selection:bg-[#FF9F1C]/30 font-inter overscroll-none">
      
      {/* 1. Fullscreen Looping Background Video */}
      <HeroBackground onVideoLoaded={() => setIsVideoLoaded(true)} />

      {isVideoLoaded && (
        <>
          {/* 2. Top Header Navigation (Template Spec: px-6 sm:px-10 lg:px-16, py-5 lg:py-7) */}
          <Navbar
            onOpenRag={() => handleOpenRag()}
            onOpenProjects={handleOpenProjects}
            onOpenResume={handleOpenResume}
            onToggleMenu={() => setIsMobileMenuOpen(true)}
          />

          {/* 3. Fullscreen Mobile Menu Overlay (below md) */}
          <MobileMenuOverlay
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            onOpenRag={handleOpenRag}
            onOpenProjects={handleOpenProjects}
            onOpenResume={handleOpenResume}
          />

          {/* 4. Main Hero Viewport Content (Vertically centered, Left-aligned) */}
          <main className="relative z-20 flex-1 flex flex-col justify-center w-full">
            <HeroContent
              onOpenProjects={handleOpenProjects}
              onOpenRag={handleOpenRag}
            />
          </main>

          {/* 5. The Glassmorphic RAG Portfolio Chat & Grounded Knowledge Panel */}
          <RagChatPanel
            isOpen={isRagOpen}
            onClose={() => {
              setIsRagOpen(false);
              setRagInitialPrompt(undefined);
            }}
            initialPrompt={ragInitialPrompt}
          />

          {/* 6. Projects Showcase Modal (MarketPulse AI, Redwood Inference, IEEE Research) */}
          <ProjectsModal
            isOpen={isProjectsModalOpen}
            onClose={() => setIsProjectsModalOpen(false)}
            onOpenRagWithTopic={handleOpenRagWithTopic}
          />

          {/* 7. Dilip Bhakadiwal Resume / Curriculum Vitae Modal */}
          <ResumeModal
            isOpen={isResumeOpen}
            onClose={() => setIsResumeOpen(false)}
          />
        </>
      )}
    </div>
  );
}
