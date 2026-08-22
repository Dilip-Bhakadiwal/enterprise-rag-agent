import React, { useState } from "react";
import { Activity, Clock, DollarSign, Server, ChevronDown, ChevronUp } from "lucide-react";
import { Telemetry } from "../types";

interface TelemetryBadgeProps {
  telemetry?: Telemetry;
  providerUsed?: string;
}

export const TelemetryBadge: React.FC<TelemetryBadgeProps> = ({
  telemetry,
  providerUsed = "openrouter",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!telemetry) return null;

  const total = telemetry.total_time_ms || 1;
  const routerPct = Math.max(8, Math.round((telemetry.router_ms / total) * 100));
  const decompPct = Math.max(8, Math.round((telemetry.decomposer_ms / total) * 100));
  const retPct = Math.max(8, Math.round((telemetry.retriever_ms / total) * 100));
  const synthPct = Math.max(15, Math.round((telemetry.synthesizer_ms / total) * 100));

  const formatMs = (ms: number) => {
    if (!ms) return "0ms";
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-white/[0.08]">
      {/* Subtle, Non-Intrusive Dev Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/30 text-[11px] text-slate-400 hover:text-amber-200 transition-all cursor-pointer select-none"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium text-slate-300">Latency: {formatMs(telemetry.total_time_ms)}</span>
        <span className="text-slate-600">·</span>
        <span>{telemetry.total_tokens} tokens</span>
        <span className="text-slate-600">·</span>
        <span className="text-amber-300 font-medium capitalize">{telemetry.active_provider || providerUsed}</span>
        {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
      </button>

      {/* Expandable Dev Waterfall Inspector */}
      {isOpen && (
        <div className="mt-2.5 p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-3 font-sans text-xs text-slate-200 animate-in fade-in duration-150">
          {/* Latency Waterfall Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Clock className="w-3 h-3 text-amber-400" />
                LangGraph Node Execution Waterfall
              </span>
              <span className="font-mono text-amber-300">{formatMs(telemetry.total_time_ms)}</span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              <div style={{ width: `${routerPct}%` }} className="bg-sky-400 rounded-sm" title={`Router: ${formatMs(telemetry.router_ms)}`} />
              <div style={{ width: `${decompPct}%` }} className="bg-indigo-400 rounded-sm" title={`Decomposer: ${formatMs(telemetry.decomposer_ms)}`} />
              <div style={{ width: `${retPct}%` }} className="bg-amber-400 rounded-sm" title={`Pinecone Retrieval: ${formatMs(telemetry.retriever_ms)}`} />
              <div style={{ width: `${synthPct}%` }} className="bg-emerald-400 rounded-sm" title={`Synthesizer: ${formatMs(telemetry.synthesizer_ms)}`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 text-[10.5px] text-slate-300">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> Router: {formatMs(telemetry.router_ms)}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" /> Decomposer: {formatMs(telemetry.decomposer_ms)}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Pinecone: {formatMs(telemetry.retriever_ms)}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> LLM Synth: {formatMs(telemetry.synthesizer_ms)}</div>
            </div>
          </div>

          {/* Token Economics & Failover Ladder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 border-t border-white/10 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1 text-[11.5px]">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Token Economics
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Prompt / Output:</span>
                <span className="font-mono text-slate-200">{telemetry.prompt_tokens} / {telemetry.completion_tokens}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Cost:</span>
                <span className="font-mono text-emerald-400 font-semibold">${telemetry.estimated_cost_usd.toFixed(6)}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1 text-[11.5px]">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                3-Tier Failover Ladder
              </div>
              <div className="text-[10.5px] text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 1. OpenRouter (Primary)
              </div>
              <div className="text-[10.5px] text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 2. Groq Cloud (108ms)
              </div>
              <div className="text-[10.5px] text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> 3. NVIDIA NIM (Fallback)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
