import React, { useState } from "react";
import { Activity, Zap, Cpu, Clock, DollarSign, Layers, ChevronDown, ChevronUp, Server } from "lucide-react";
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

  // Calculate percentages for waterfall chart
  const total = telemetry.total_time_ms || 1;
  const routerPct = Math.max(5, Math.round((telemetry.router_ms / total) * 100));
  const decompPct = Math.max(5, Math.round((telemetry.decomposer_ms / total) * 100));
  const retPct = Math.max(5, Math.round((telemetry.retriever_ms / total) * 100));
  const synthPct = Math.max(10, Math.round((telemetry.synthesizer_ms / total) * 100));

  const formatMs = (ms: number) => {
    if (!ms) return "0ms";
    return ms > 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-white/10 text-xs">
      {/* Clickable Header Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-amber-500/20 text-slate-300 hover:text-amber-200 transition-all font-mono text-[11px]"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-amber-300 font-semibold">Dev Telemetry:</span>
          <span>{formatMs(telemetry.total_time_ms)}</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 capitalize">{telemetry.active_provider || providerUsed}</span>
          <span className="text-slate-500">|</span>
          <span>{telemetry.total_tokens} tokens</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[10px]">{isOpen ? "Hide" : "Inspect"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Metrics Breakdown Drawer */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-xl bg-black/70 border border-amber-500/25 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 font-mono text-[11px]">
          {/* Latency Waterfall Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="w-3 h-3 text-amber-400" /> Graph Node Latency Waterfall ({formatMs(telemetry.total_time_ms)})
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              <div style={{ width: `${routerPct}%` }} className="bg-sky-400 rounded-sm" title={`Router: ${formatMs(telemetry.router_ms)}`} />
              <div style={{ width: `${decompPct}%` }} className="bg-indigo-400 rounded-sm" title={`Decomposer: ${formatMs(telemetry.decomposer_ms)}`} />
              <div style={{ width: `${retPct}%` }} className="bg-amber-400 rounded-sm" title={`Pinecone Retriever: ${formatMs(telemetry.retriever_ms)}`} />
              <div style={{ width: `${synthPct}%` }} className="bg-emerald-400 rounded-sm" title={`Synthesizer: ${formatMs(telemetry.synthesizer_ms)}`} />
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1.5 text-[9.5px] text-slate-300">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Router: {formatMs(telemetry.router_ms)}</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />Decomp: {formatMs(telemetry.decomposer_ms)}</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pinecone: {formatMs(telemetry.retriever_ms)}</div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LLM: {formatMs(telemetry.synthesizer_ms)}</div>
            </div>
          </div>

          {/* Token Economics & Failover Tier */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10.5px]">
            <div className="p-2 rounded-lg bg-white/[0.04] border border-white/5 space-y-1">
              <div className="text-amber-200 font-semibold flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-400" /> Token Economics
              </div>
              <div className="text-slate-300">Prompt Tokens: <span className="text-white font-bold">{telemetry.prompt_tokens}</span></div>
              <div className="text-slate-300">Completion Tokens: <span className="text-white font-bold">{telemetry.completion_tokens}</span></div>
              <div className="text-slate-300">Est. Query Cost: <span className="text-emerald-400 font-bold">${telemetry.estimated_cost_usd}</span></div>
            </div>

            <div className="p-2 rounded-lg bg-white/[0.04] border border-white/5 space-y-1">
              <div className="text-amber-200 font-semibold flex items-center gap-1">
                <Server className="w-3 h-3 text-amber-400" /> LLM Failover Ladder
              </div>
              <div className="text-slate-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 1. OpenRouter (Primary)
              </div>
              <div className="text-slate-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 2. Groq Cloud (108ms)
              </div>
              <div className="text-slate-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> 3. NVIDIA NIM (Fallback)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
