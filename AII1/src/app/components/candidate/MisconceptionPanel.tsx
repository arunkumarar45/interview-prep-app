// src/app/components/candidate/MisconceptionPanel.tsx
// Profile screen panel that lists unresolved misconceptions and allows
// the user to mark them as understood.
//
// Flow:
//   User clicks "Mark as Understood"
//     → POST /api/interview/misconception/:id/resolve (authenticated backend)
//     → ownership verification + resolveMisconception()
//     → optimistically removes item from list
//     → shows success state
//     → calls onResolved() so parent can refresh the full data
//
// Security:
//   - Resolution goes through the backend, never directly to Supabase
//   - Backend verifies ownership before resolving

import { useState, useCallback } from "react";
import { apiFetch } from "../../../lib/api";
import type { Misconception } from "./useCandidateIntelligence";

const DOMAIN_LABEL: Record<string, string> = {
  technical: "Technical",
  hr: "HR",
  project: "Project",
};

// ─── Single misconception card ────────────────────────────────────────────────

interface MisconceptionCardProps {
  mc: Misconception;
  onResolved: (id: string) => void;
}

function MisconceptionCard({ mc, onResolved }: MisconceptionCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResolve = useCallback(async () => {
    if (status === "loading" || status === "success") return;
    setStatus("loading");
    setErrorMsg(null);

    try {
      await apiFetch<{ success: boolean; id: string; resolved: boolean }>(
        `/api/interview/misconception/${mc.id}/resolve`,
        { method: "POST" }
      );
      setStatus("success");
      // Notify parent after a short delay so user sees the success state
      setTimeout(() => onResolved(mc.id), 800);
    } catch (err) {
      const msg = (err as Error).message ?? "Failed to resolve. Please try again.";
      // Handle specific cases gracefully
      if (msg.includes("already resolved")) {
        setStatus("success");
        setTimeout(() => onResolved(mc.id), 500);
      } else {
        setStatus("error");
        setErrorMsg(msg);
      }
    }
  }, [mc.id, status, onResolved]);

  const detectedDate = new Date(mc.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      id={`misconception-card-${mc.id}`}
      className={`p-5 rounded-2xl border transition-all ${
        status === "success"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-white/8 bg-white/3"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 uppercase tracking-wider">
            {DOMAIN_LABEL[mc.domain] ?? mc.domain}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/8">
            {mc.competency}
          </span>
        </div>
        <span className="text-xs text-white/30 shrink-0">{detectedDate}</span>
      </div>

      {/* Incorrect belief */}
      <div className="mb-2">
        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Incorrect belief</p>
        <p className="text-sm text-red-300/80 leading-relaxed">{mc.incorrect_belief}</p>
      </div>

      {/* Correction */}
      <div className="mb-4">
        <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Correction</p>
        <p className="text-sm text-[#2dd4bf]/80 leading-relaxed">{mc.correction}</p>
      </div>

      {/* Error banner */}
      {status === "error" && errorMsg && (
        <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Action button */}
      <button
        id={`resolve-misconception-${mc.id}`}
        onClick={handleResolve}
        disabled={status === "loading" || status === "success"}
        className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
          status === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
            : status === "loading"
            ? "border-white/8 bg-white/3 text-white/30 cursor-wait"
            : "border-white/12 bg-white/5 text-white/70 hover:bg-white/8 hover:text-white hover:border-white/20"
        }`}
      >
        {status === "success" ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Marked as understood
          </>
        ) : status === "loading" ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Resolving...
          </>
        ) : (
          "Mark as Understood"
        )}
      </button>
    </div>
  );
}

// ─── Panel skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="h-40 rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface MisconceptionPanelProps {
  misconceptions: Misconception[];
  loading: boolean;
  error: string | null;
  onResolved: (id: string) => void;
}

export function MisconceptionPanel({
  misconceptions,
  loading,
  error,
  onResolved,
}: MisconceptionPanelProps) {
  // Track IDs optimistically removed from the list after resolution
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleResolved = useCallback((id: string) => {
    setResolvedIds((prev) => new Set([...prev, id]));
    onResolved(id);
  }, [onResolved]);

  const visibleItems = misconceptions.filter((mc) => !resolvedIds.has(mc.id));

  return (
    <div id="misconception-panel">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">Misconceptions</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {loading
              ? "Loading..."
              : visibleItems.length === 0
              ? "All misconceptions resolved"
              : `${visibleItems.length} unresolved — review and mark as understood`}
          </p>
        </div>
        {!loading && visibleItems.length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400">
            {visibleItems.length} pending
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-red-400 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Failed to load misconceptions
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white/60">No pending misconceptions</p>
          <p className="text-xs text-white/30">
            {misconceptions.length > 0
              ? "All your misconceptions have been resolved. Great work!"
              : "Complete an interview for the AI to identify any knowledge gaps."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((mc) => (
            <MisconceptionCard key={mc.id} mc={mc} onResolved={handleResolved} />
          ))}
        </div>
      )}
    </div>
  );
}
