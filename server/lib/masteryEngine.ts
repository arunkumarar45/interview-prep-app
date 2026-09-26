// server/lib/masteryEngine.ts
// Updates competency_scores after every evaluation.
//
// Mastery level rules (require 2+ consecutive data points to prevent flip-flop):
//   avg >= 85 AND stddev < 15 AND attempts >= 2  → mastered
//   avg >= 70                                    → strong
//   avg >= 50                                    → competent
//   avg >= 30                                    → developing
//   avg < 30                                     → weak
//
// Uses the last 3 scores for rolling average (stored as jsonb in DB).
// A single high score does NOT achieve "mastered" — requires consistency.

import { supabaseAdmin } from "./supabase";
import type { InterviewDomain, MasteryLevel } from "./questionBlueprint";

const MASTERY_WINDOW = 3;  // Rolling window for recent scores

/**
 * Compute population standard deviation of an array of numbers.
 * Returns 0 if fewer than 2 values.
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Determines mastery level from recent scores + total attempts.
 * Requires at least 2 attempts to move above "developing".
 * Requires consistency (low stddev) to achieve "mastered".
 */
export function calculateMasteryLevel(
  recentScores: number[],
  attempts: number
): MasteryLevel {
  if (recentScores.length === 0 || attempts === 0) return "weak";

  const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const sd = stdDev(recentScores);

  // Need at least 2 data points to claim "strong" or above
  if (attempts < 2) {
    if (avg >= 50) return "developing";
    return "weak";
  }

  if (avg >= 85 && sd < 15 && attempts >= 2) return "mastered";
  if (avg >= 70) return "strong";
  if (avg >= 50) return "competent";
  if (avg >= 30) return "developing";
  return "weak";
}

/**
 * Upserts the competency_scores row for a user+domain+competency
 * after an evaluation. Updates: attempts, last_score, recent_scores, mastery_level.
 *
 * This is safe to call fire-and-forget (don't await in hot path).
 */
export async function updateCompetencyScore(
  userId: string,
  domain: InterviewDomain,
  competency: string,
  newScore: number
): Promise<void> {
  const clampedScore = Math.max(0, Math.min(100, Math.round(newScore)));

  // Fetch existing row (null if first attempt)
  const { data: existing } = await supabaseAdmin
    .from("competency_scores")
    .select("attempts, recent_scores")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("competency", competency)
    .maybeSingle();

  const prevAttempts = (existing?.attempts as number) ?? 0;
  const prevRecentScores = (existing?.recent_scores as number[]) ?? [];

  // Update rolling window: keep last MASTERY_WINDOW scores
  const newRecentScores = [...prevRecentScores, clampedScore].slice(-MASTERY_WINDOW);
  const newAttempts = prevAttempts + 1;
  const masteryLevel = calculateMasteryLevel(newRecentScores, newAttempts);

  const { error } = await supabaseAdmin
    .from("competency_scores")
    .upsert(
      {
        user_id: userId,
        domain,
        competency,
        attempts: newAttempts,
        correct_weighted: newRecentScores.reduce((a, b) => a + b, 0) / newRecentScores.length,
        last_score: clampedScore,
        recent_scores: newRecentScores,
        mastery_level: masteryLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain,competency" }
    );

  if (error) {
    throw new Error(`masteryEngine: failed to upsert competency score — ${error.message}`);
  }
}

/**
 * Marks a misconception as resolved after the user demonstrates understanding.
 * Called when an evaluation of a remediation question shows score >= 70
 * AND the previously-flagged misconception concept is covered.
 */
export async function resolveMisconception(
  misconceptionId: string,
  userId: string  // ownership check — never resolve other users' misconceptions
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("misconceptions")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", misconceptionId)
    .eq("user_id", userId);  // scoped to user — no cross-user resolution possible

  if (error) {
    throw new Error(`masteryEngine: failed to resolve misconception — ${error.message}`);
  }
}
