import React, { useState } from "react";
import { HeroBackground } from "./components/HeroBackground";
import { Navbar } from "./components/Navbar";
import { HeroContent } from "./components/HeroContent";
import { SocialProof } from "./components/SocialProof";
import { RagChatPanel } from "./components/RagChatPanel";
import { ProjectsModal } from "./components/ProjectsModal";
import { ResumeModal } from "./components/ResumeModal";

export default function App() {
  const [isRagOpen, setIsRagOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#101722] text-white selection:bg-white/20">
      
      {/* 1. Cinematic Misty Mountain Landscape Background */}
      <HeroBackground />

      {/* 2. Top Header Navigation */}
      <Navbar
        onOpenRag={() => handleOpenRag()}
        onOpenProjects={handleOpenProjects}
        onOpenResume={handleOpenResume}
      />

      {/* 3. Main Hero Viewport Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto w-full">
        <HeroContent
          onOpenProjects={handleOpenProjects}
          onOpenRag={handleOpenRag}
        />
      </main>

      {/* 4. Social Proof / Credibility Foundations */}
      <SocialProof />

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

    </div>
  );
}
