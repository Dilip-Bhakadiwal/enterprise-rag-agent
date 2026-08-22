export interface KnowledgeDoc {
  id: string;
  title: string;
  category: "Biography & Credentials" | "Research & Publications" | "Featured Projects" | "Architecture & Stack" | "System Design";
  tags: string[];
  summary: string;
  content: string;
}

export interface Citation {
  id: string;
  title: string;
  category: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface ProjectDetail {
  id: string;
  title: string;
  tagline: string;
  category: "Agentic Systems" | "Enterprise RAG" | "Published Research";
  stack: string[];
  highlights: string[];
  architectureNotes: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  metrics: string[];
}
