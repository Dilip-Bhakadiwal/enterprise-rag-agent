import React, { useState } from "react";
import { X, Download, ExternalLink, FileText, Printer, Phone, Mail, Linkedin, Github, MapPin, Check, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import dilipLogo from "../assets/dilip_web_app_logo.png";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to clean white theme

  const pdfPath = "/Dilip_resume.pdf";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfPath;
    link.download = "Dilip_Bhakadiwal_Resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewWindow = () => {
    window.open(pdfPath, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("9828dilip@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="resume-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm"
        >
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={onClose}
            aria-label="Close Resume"
          />

          {/* Modal Container with UNIFIED seamless background */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className={`relative z-10 w-full max-w-4xl max-h-[96dvh] sm:max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl border overflow-hidden transition-colors duration-300 ${
              isDarkMode
                ? "bg-[#0b101b] border-white/15 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
        
        {/* Modal Top Action Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-6 py-3 border-b shrink-0 ${
          isDarkMode ? "bg-[#0f172a] border-white/10" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src={dilipLogo}
              alt="Dilip Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain border border-slate-300/40 shadow-sm shrink-0"
            />
            <div>
              <h3 className={`font-bold text-xs sm:text-base leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Dilip Bhakadiwal — Resume
              </h3>
              <p className={`text-[10px] sm:text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                M.Tech AI (DIAT) • Agentic AI &amp; Backend Engineer
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Open in New Window (Direct PDF) */}
            <button
              onClick={handleOpenNewWindow}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-[#FF9F1C] hover:bg-[#E67E22] text-slate-950 font-bold text-xs shadow-md shadow-[#FF9F1C]/20 transition-all cursor-pointer"
              title="Open Official PDF in New Window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">PDF</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isDarkMode 
                  ? "bg-white/10 hover:bg-white/20 text-slate-200" 
                  : "bg-slate-200 hover:bg-slate-300 text-slate-800"
              }`}
              title="Download Dilip_resume.pdf"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Toggle Dark/Light Paper Mode */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? "hover:bg-white/20 text-amber-300" : "hover:bg-slate-200 text-slate-700"
              }`}
              title={isDarkMode ? "Switch to White Theme" : "Switch to Dark Theme"}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className={`p-2 min-h-[38px] min-w-[38px] rounded-lg transition-colors cursor-pointer hidden sm:inline-flex items-center justify-center ${
                isDarkMode ? "hover:bg-white/20 text-slate-300" : "hover:bg-slate-200 text-slate-700"
              }`}
              title="Print Resume"
              aria-label="Print Resume"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ml-1 ${
                isDarkMode ? "hover:bg-white/20 text-slate-300 hover:text-white" : "hover:bg-slate-200 text-slate-700 hover:text-black"
              }`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Subheader Banner */}
        <div className={`px-4 sm:px-5 py-2 text-[11px] sm:text-[12px] flex items-center justify-between border-b shrink-0 ${
          isDarkMode 
            ? "bg-sky-950/40 border-sky-800/40 text-sky-300" 
            : "bg-sky-50 border-sky-200 text-sky-800 font-medium"
        }`}>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">Mobile &amp; iOS Optimized Document View</span>
          </span>
          <button
            onClick={handleOpenNewWindow}
            className="underline hover:opacity-80 cursor-pointer hidden sm:inline text-xs font-semibold shrink-0"
          >
            Open standalone Dilip_resume.pdf →
          </button>
        </div>

        {/* Seamless Unified Resume Scroll Viewport (No mismatched outer/inner background colors) */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 ios-scroll ${
          isDarkMode ? "bg-[#0b1120]" : "bg-white"
        }`}>
          <div className="max-w-3xl mx-auto">
            
            {/* Header: Name & Contact Info */}
            <div className={`text-center pb-5 border-b ${
              isDarkMode ? "border-white/15" : "border-slate-300"
            }`}>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2.5 ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}>
                Dilip Bhakadiwal
              </h1>
              
              <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-medium ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}>
                <span className="flex items-center gap-1">
                  <Phone className={`w-3 h-3 ${isDarkMode ? "text-sky-400" : "text-slate-500"}`} />
                  <span>+91-8003046831</span>
                </span>
                <span className="opacity-40">|</span>

                <button
                  onClick={handleCopyEmail}
                  className="hover:text-sky-600 flex items-center gap-1 cursor-pointer"
                  title="Click to copy email"
                >
                  <Mail className={`w-3 h-3 ${isDarkMode ? "text-sky-400" : "text-slate-500"}`} />
                  <span>9828dilip@gmail.com</span>
                  {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : null}
                </button>
                <span className="opacity-40">|</span>

                <a
                  href="https://linkedin.com/in/dilip-bhakadiwal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 flex items-center gap-1"
                >
                  <Linkedin className={`w-3 h-3 ${isDarkMode ? "text-sky-400" : "text-blue-600"}`} />
                  <span>linkedin.com/in/dilip-bhakadiwal</span>
                </a>
                <span className="opacity-40">|</span>

                <a
                  href="https://github.com/Dilip-Bhakadiwal/AI-Projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-600 flex items-center gap-1"
                >
                  <Github className={`w-3 h-3 ${isDarkMode ? "text-sky-400" : "text-slate-800"}`} />
                  <span>github.com/Dilip-Bhakadiwal/AI-Projects</span>
                </a>
                <span className="opacity-40">|</span>

                <span className="flex items-center gap-1">
                  <MapPin className={`w-3 h-3 ${isDarkMode ? "text-sky-400" : "text-slate-500"}`} />
                  <span>Jaipur, Rajasthan (Open to Remote)</span>
                </span>
              </div>
            </div>

            {/* Professional Summary */}
            <div className={`mt-4 p-3.5 rounded-xl text-xs sm:text-[13px] leading-relaxed border ${
              isDarkMode 
                ? "bg-slate-900/60 border-white/10 text-slate-200" 
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              AI/ML Engineer specializing in Agentic workflows, GraphRAG, and high-performance LLM orchestration. Proven experience architecting scalable multi-agent systems, deploying open-source models locally (Llama 3.3, Qwen), and optimizing retrieval pipelines for enterprise-grade, sub-second inference.
            </div>

            {/* Section 1: TECHNICAL SKILLS */}
            <div className="mt-5">
              <h2 className={`text-xs sm:text-sm font-bold tracking-wider uppercase border-b pb-1.5 mb-3 ${
                isDarkMode ? "text-sky-400 border-white/15" : "text-slate-900 border-slate-300"
              }`}>
                Technical Skills
              </h2>
              <div className={`space-y-2 text-xs sm:text-[13px] leading-relaxed ${
                isDarkMode ? "text-slate-300" : "text-slate-800"
              }`}>
                <div>
                  <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Agentic AI &amp; Orchestration: </span>
                  <span>LangGraph, LangChain, Model Context Protocol (MCP), ReAct Agent Workflows</span>
                </div>
                <div>
                  <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Backend &amp; Cloud Pipelines: </span>
                  <span>FastAPI, AWS, Docker, Render, GitHub Actions (CI/CD)</span>
                </div>
                <div>
                  <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Data Processing &amp; Retrieval: </span>
                  <span>GraphRAG, Neo4j, Pinecone, PostgreSQL, FastEmbed, Redis</span>
                </div>
                <div>
                  <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>LLM Integration &amp; Evals: </span>
                  <span>LangSmith, Prompt Guardrails, PII Redaction</span>
                </div>
                <div>
                  <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Programming &amp; Tools: </span>
                  <span>Python, PyTorch, TypeScript, React, Git, Pandas, NumPy</span>
                </div>
              </div>
            </div>

            {/* Section 2: EDUCATION */}
            <div className="mt-5">
              <h2 className={`text-xs sm:text-sm font-bold tracking-wider uppercase border-b pb-1.5 mb-3 ${
                isDarkMode ? "text-sky-400 border-white/15" : "text-slate-900 border-slate-300"
              }`}>
                Education
              </h2>
              <div className="space-y-3 text-xs sm:text-[13px]">
                <div>
                  <div className={`flex justify-between items-baseline font-bold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}>
                    <span>Defence Institute of Advanced Technology (DIAT)</span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>2024 – 2026</span>
                  </div>
                  <div className={`flex justify-between items-baseline italic mt-0.5 ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <span>Master of Technology in Artificial Intelligence • CGPA: 7.33</span>
                    <span className="not-italic text-slate-500">Pune, Maharashtra</span>
                  </div>
                </div>

                <div>
                  <div className={`flex justify-between items-baseline font-bold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}>
                    <span>MBM University</span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>2019 – 2023</span>
                  </div>
                  <div className={`flex justify-between items-baseline italic mt-0.5 ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <span>Bachelor of Engineering in Electronics and Computer Engineering | GATE 2023 Qualified</span>
                    <span className="not-italic text-slate-500">Jodhpur, Rajasthan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: KEY AI ENGINEERING PROJECTS */}
            <div className="mt-5">
              <h2 className={`text-xs sm:text-sm font-bold tracking-wider uppercase border-b pb-1.5 mb-3 ${
                isDarkMode ? "text-sky-400 border-white/15" : "text-slate-900 border-slate-300"
              }`}>
                Key AI Engineering Projects
              </h2>
              
              <div className="space-y-4 text-xs sm:text-[13px]">
                {/* Nexora AI */}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Nexora AI: Enterprise GraphRAG Platform | <span className="font-normal italic text-sky-600">LangGraph, Neo4j, Pinecone, Groq LPU</span>
                    </span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>2026</span>
                  </div>
                  <ul className={`list-disc list-outside ml-4 mt-1.5 space-y-1 leading-relaxed ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <li>Architected a multi-agent GraphRAG platform unifying Neo4j Cypher traversals with Pinecone semantic search, achieving 99.4% multi-hop retrieval accuracy.</li>
                    <li>Engineered a sub-second (&lt;200ms) LPU inference pipeline using Groq with automated failover, deployed as a fully containerized React and FastAPI architecture on Render.</li>
                    <li>Implemented an ephemeral memory engine with active PII redaction guardrails (stripping SSNs, API keys) and strict rate-limiting for enterprise-grade data security.</li>
                  </ul>
                </div>

                {/* AlignAI Engine */}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      AlignAI Engine: Autonomous Job Discovery | <span className="font-normal italic text-sky-600">LangGraph, Pinecone, Neo4j, FastEmbed</span>
                    </span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>2026</span>
                  </div>
                  <ul className={`list-disc list-outside ml-4 mt-1.5 space-y-1 leading-relaxed ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <li>Developed a LangGraph-orchestrated multi-agent state machine to autonomously ingest and normalize API-sourced job postings, processing 100+ roles/minute and eliminating 85% of keyword-matching noise.</li>
                    <li>Designed a 3-signal fit-ranking algorithm combining dense cosine similarity, Neo4j graph coverage, and LLM evaluation for explainable candidate-role alignment.</li>
                    <li>Built a SHA-256 caching architecture utilizing RapidFuzz for continuous entity resolution, eliminating graph node duplication and automatically recomputing vectors on profile updates.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4: RESEARCH EXPERIENCE */}
            <div className="mt-5">
              <h2 className={`text-xs sm:text-sm font-bold tracking-wider uppercase border-b pb-1.5 mb-3 ${
                isDarkMode ? "text-sky-400 border-white/15" : "text-slate-900 border-slate-300"
              }`}>
                Research Experience
              </h2>

              <div className="space-y-4 text-xs sm:text-[13px]">
                {/* Edge AI Object Detection */}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Edge AI Object Detection System on FPGA and Jetson Platforms
                    </span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>Sept. 2025 – Jan. 2026</span>
                  </div>
                  <div className={`italic mb-1 ${isDarkMode ? "text-sky-400" : "text-sky-700"}`}>
                    Research Project, DIAT Pune, Maharashtra
                  </div>
                  <ul className={`list-disc list-outside ml-4 mt-1 space-y-1 leading-relaxed ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <li>Designed and quantized (FP32 to INT8) a lightweight YOLOv8n architecture, achieving 45 FPS on an NVIDIA Jetson Orin and 13 FPS on a Xilinx FPGA for edge deployment.</li>
                    <li>Integrated a LLaMA 1B model to generate contextual natural-language descriptions of detected objects in real time.</li>
                  </ul>
                </div>

                {/* Focal-CBAM Fish-YOLO */}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Focal-CBAM Fish-YOLO | <span className="font-normal text-sky-600">Funded by MoES, Govt. of India</span>
                    </span>
                    <span className={isDarkMode ? "text-slate-400 font-semibold" : "text-slate-700 font-semibold"}>Aug. 2025 – Oct. 2025</span>
                  </div>
                  <div className={`italic mb-1 ${isDarkMode ? "text-sky-400" : "text-sky-700"}`}>
                    Research Project, DIAT Pune, Maharashtra
                  </div>
                  <ul className={`list-disc list-outside ml-4 mt-1 space-y-1 leading-relaxed ${
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  }`}>
                    <li>Developed an attention-enhanced YOLOv8 detection architecture using a novel Focal-CBAM module to improve feature attention and accuracy in noisy underwater environments.</li>
                    <li>Optimized multi-scale detection heads on the RUOD dataset, successfully outperforming baseline architectures on underwater localization benchmarks.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 5: PUBLICATIONS */}
            <div className="mt-5">
              <h2 className={`text-xs sm:text-sm font-bold tracking-wider uppercase border-b pb-1.5 mb-3 ${
                isDarkMode ? "text-sky-400 border-white/15" : "text-slate-900 border-slate-300"
              }`}>
                Publications
              </h2>

              <div className="space-y-3 text-xs sm:text-[13px]">
                <div>
                  <div className="flex justify-between items-baseline font-bold">
                    <span className={isDarkMode ? "text-white" : "text-slate-900"}>Deep Underwater Fish Detection via Focal Modulated Channel Attention in YOLO</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isDarkMode ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-emerald-100 text-emerald-800"
                    }`}>1st Author, ICASA 2026 (London)</span>
                  </div>
                  <div className={`ml-4 mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    • First Author | <span className="font-semibold text-sky-600">ICASA Conference 2026</span> | Funded by MoES, Govt. of India
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline font-bold">
                    <span className={isDarkMode ? "text-white" : "text-slate-900"}>ANIMA: YOLOv8-Based Framework for Object Detection &amp; Compression</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isDarkMode ? "bg-sky-500/20 text-sky-300 border border-sky-400/30" : "bg-blue-100 text-blue-800"
                    }`}>2nd Author</span>
                  </div>
                  <div className={`ml-4 mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    • Second Author | <span className="font-semibold text-sky-600">IEEE Xplore</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Spacing Padding */}
            <div className="h-8"></div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
