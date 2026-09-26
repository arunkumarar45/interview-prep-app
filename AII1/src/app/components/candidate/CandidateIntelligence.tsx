// src/app/components/candidate/CandidateIntelligence.tsx
// Dashboard card displaying Candidate Intelligence: competency heatmap,
// weak competencies, and pending misconception count.
//
// Receives data from the useCandidateIntelligence hook (passed as props to avoid
// double-fetching when both Dashboard and Profile use the same data).
//
// Design: follows the existing glass-card design system (bg-[#0d1730], border-white/8)

import type { CompetencyScore, Misconception, MasteryLevel } from "./useCandidateIntelligence";

// ─── Mastery level design tokens ─────────────────────────────────────────────

const MASTERY_CONFIG: Record<MasteryLevel, {
  label: string;
  chipBg: string;
  chipText: string;
  barColor: string;
  dot: string;
}> = {
  mastered:   { label: "MASTERED",   chipBg: "bg-emerald-500/15", chipText: "text-emerald-400",  barColor: "bg-emerald-500",  dot: "bg-emerald-400" },
  strong:     { label: "STRONG",     chipBg: "bg-teal-500/15",    chipText: "text-[#2dd4bf]",     barColor: "bg-teal-500",     dot: "bg-teal-400" },
  competent:  { label: "COMPETENT",  chipBg: "bg-blue-500/15",    chipText: "text-blue-400",      barColor: "bg-blue-500",     dot: "bg-blue-400" },
  developing: { label: "DEVELOPING", chipBg: "bg-amber-500/15",   chipText: "text-amber-400",     barColor: "bg-amber-500",    dot: "bg-amber-400" },
  weak:       { label: "WEAK",       chipBg: "bg-red-500/15",     chipText: "text-red-400",       barColor: "bg-red-500",      dot: "bg-red-400" },
};

const DOMAIN_LABEL: Record<string, string> = {
  technical: "Technical",
  hr: "HR",
  project: "Project",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CandidateIntelligenceProps {
  competencyScores: CompetencyScore[];
  unresolvedMisconceptions: Misconception[];
  loading: boolean;
  error: string | null;
  onReviewMisconceptions?: () => void;  // Navigate to misconception section
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

// ─── Competency chip (heatmap item) ───────────────────────────────────────────

function CompetencyChip({ score }: { score: CompetencyScore }) {
  const cfg = MASTERY_CONFIG[score.mastery_level];
  return (
    <div className="flex items-center justify-between p-3.5 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate leading-tight">{score.competency}</p>
          <p className="text-xs text-white/35 mt-0.5">{DOMAIN_LABEL[score.domain] ?? score.domain} · {score.attempts} attempt{score.attempts !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className={`text-sm font-bold font-['JetBrains_Mono'] ${
          score.last_score >= 80 ? "text-emerald-400" :
          score.last_score >= 70 ? "text-teal-400" :
          score.last_score >= 50 ? "text-blue-400" :
          score.last_score >= 30 ? "text-amber-400" : "text-red-400"
        }`}>{score.last_score}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.chipBg} ${cfg.chipText}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CandidateIntelligence({
  competencyScores,
  unresolvedMisconceptions,
  loading,
  error,
  onReviewMisconceptions,
}: CandidateIntelligenceProps) {

  if (error) {
    return (
      <div className="p-5 bg-white/3 border border-white/8 rounded-2xl">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Failed to load competency data
        </div>
      </div>
    );
  }

  // Determine which competencies to show in heatmap (max 8, sorted by mastery level)
  const MASTERY_ORDER: MasteryLevel[] = ["weak", "developing", "competent", "strong", "mastered"];
  const sortedScores = [...competencyScores].sort((a, b) => {
    const ai = MASTERY_ORDER.indexOf(a.mastery_level);
    const bi = MASTERY_ORDER.indexOf(b.mastery_level);
    return ai - bi; // weakest first
  });
  const heatmapItems = sortedScores.slice(0, 8);

  // Weak competencies: mastery_level is "weak" or "developing"
  const weakItems = sortedScores
    .filter((s) => s.mastery_level === "weak" || s.mastery_level === "developing")
    .slice(0, 3);

  return (
    <div id="candidate-intelligence-card" className="p-6 bg-white/2 border border-white/8 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-base">Competency Intelligence</h3>
          <p className="text-xs text-white/40 mt-0.5">Driven by your interview evaluations</p>
        </div>
        {!loading && competencyScores.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-white/40">
            {Object.entries(MASTERY_CONFIG).map(([level, cfg]) => (
              <span key={level} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label[0] + cfg.label.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton />
      ) : competencyScores.length === 0 ? (
        // Empty state
        <div className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-[#818cf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white/60">No competency data yet</p>
          <p className="text-xs text-white/30">Complete a mock interview to start building your competency profile.</p>
        </div>
      ) : (
        <>
          {/* Competency heatmap */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Competency Heatmap</p>
            <div className="space-y-2">
              {heatmapItems.map((score) => (
                <CompetencyChip key={`${score.domain}-${score.competency}`} score={score} />
              ))}
              {competencyScores.length > 8 && (
                <p className="text-xs text-white/30 text-center pt-1">
                  +{competencyScores.length - 8} more competencies tracked
                </p>
              )}
            </div>
          </div>

          {/* Weak competencies callout */}
          {weakItems.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-400 mb-2.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Areas needing attention
              </p>
              <div className="space-y-2">
                {weakItems.map((s) => {
                  const cfg = MASTERY_CONFIG[s.mastery_level];
                  return (
                    <div key={`${s.domain}-${s.competency}`} className="flex items-center justify-between text-xs">
                      <span className="text-white/60 truncate max-w-[60%]">{s.competency}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.barColor}`} style={{ width: `${s.last_score}%` }} />
                        </div>
                        <span className={`font-['JetBrains_Mono'] font-bold ${cfg.chipText}`}>{s.last_score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending misconceptions banner */}
          {unresolvedMisconceptions.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-rose-400">
                  {unresolvedMisconceptions.length} Pending Misconception{unresolvedMisconceptions.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-white/35 mt-0.5">Review and mark as understood to keep your profile current</p>
              </div>
              {onReviewMisconceptions && (
                <button
                  id="review-misconceptions-btn"
                  onClick={onReviewMisconceptions}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 border border-rose-400/30 rounded-lg px-3 py-1.5 transition-colors cursor-pointer hover:bg-rose-500/10"
                >
                  Review →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
