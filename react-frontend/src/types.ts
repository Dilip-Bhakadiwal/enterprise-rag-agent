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
  chunk_text?: string;
  author?: string;
  timestamp?: string;
  score?: number | null;
  source_type?: string;
  doc_id?: string;
}

export interface Telemetry {
  total_time_ms: number;
  router_ms: number;
  decomposer_ms: number;
  retriever_ms: number;
  grader_ms: number;
  synthesizer_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  active_provider: string;
  failover_status: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  suggestions?: string[];
  telemetry?: Telemetry;
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
