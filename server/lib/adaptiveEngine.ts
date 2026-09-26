// server/lib/adaptiveEngine.ts
// Determines the next question's adaptive context based on session trajectory.
//
// State transitions (require 2 consecutive signals to avoid flip-flop):
//   last 2 scores avg >= 85 → deeper/harder / new competency
//   last 2 scores avg 70–84 → same competency, harder variant
//   last 2 scores avg 50–69 → targeted follow-up on partial answer
//   last 2 scores avg 30–49 → easier question, foundational recovery
//   last 2 scores avg < 30  → foundational + misconception remediation
//
// Single data point rules (no consecutive comparison):
//   score >= 85 → try harder
//   score < 50  → easier recovery immediately
//   otherwise   → continue at same level
//
// Priority override: if there are unresolved misconceptions,
// the next question ALWAYS targets a misconception regardless of score.

import type {
  AdaptiveContext,
  Difficulty,
  InterviewDomain,
} from "./questionBlueprint";

export interface SessionState {
  scores: number[];        // score for each completed turn (oldest to newest)
  competencies: string[];  // competency for each completed turn (same index as scores)
  difficulties: Difficulty[];
  lastQuestionId: string | null;
}

type AdaptiveDifficulty = "easier" | "same" | "harder" | "much_harder";

/**
 * Determine difficulty shift from recent score trajectory.
 */
function assessDifficultyShift(scores: number[]): AdaptiveDifficulty {
  if (scores.length === 0) return "same";

  const last = scores[scores.length - 1];
  const last2avg =
    scores.length >= 2
      ? (scores[scores.length - 1] + scores[scores.length - 2]) / 2
      : last;

  // Use 2-score average if available (more reliable than single point)
  const signal = scores.length >= 2 ? last2avg : last;

  if (signal >= 85) return "much_harder";
  if (signal >= 70) return "harder";
  if (signal >= 50) return "same";
  if (signal >= 30) return "easier";
  return "easier";
}

/**
 * Clamp difficulty up or down within the valid difficulty enum.
 */
function shiftDifficulty(current: Difficulty, shift: AdaptiveDifficulty): Difficulty {
  const levels: Difficulty[] = ["easy", "medium", "hard", "scenario", "architecture"];
  const idx = levels.indexOf(current);
  const safeIdx = idx === -1 ? 1 : idx;  // default to "medium" if unknown

  switch (shift) {
    case "much_harder":
      return levels[Math.min(safeIdx + 2, levels.length - 1)];
    case "harder":
      return levels[Math.min(safeIdx + 1, levels.length - 1)];
    case "easier":
      return levels[Math.max(safeIdx - 1, 0)];
    case "same":
    default:
      return levels[safeIdx];
  }
}

/**
 * Determine if the next question should stay on the same competency
 * or move to a new one.
 */
function shouldExploreNewCompetency(
  scores: number[],
  competencies: string[]
): boolean {
  if (scores.length === 0) return false;
  const last2 = scores.slice(-2);
  const avg = last2.reduce((a, b) => a + b, 0) / last2.length;

  // Move on if consistently strong (mastered this area in session)
  return avg >= 85 && last2.length >= 2;
}

/**
 * Core adaptive engine: given a session state, returns the adaptive context
 * the question engine should use for the next question.
 *
 * @param sessionState  Current session's scores + competencies
 * @param domain        Interview domain
 * @param hasUnresolvedMisconceptions  Whether DB has unresolved misconceptions
 * @returns             AdaptiveContext for the question engine
 */
export function decideNextQuestion(
  sessionState: SessionState,
  domain: InterviewDomain,
  hasUnresolvedMisconceptions: boolean
): AdaptiveContext {
  const { scores, competencies, difficulties } = sessionState;

  // Priority override: always remediate misconceptions first
  if (hasUnresolvedMisconceptions && scores.length > 0) {
    return {
      reasonType: "misconception_remediation",
      targetCompetency:
        competencies[competencies.length - 1] ?? "general",
      targetDifficulty: "easy",
      reason: "Addressing unresolved misconception detected in previous answer",
    };
  }

  // No history yet → start fresh at medium
  if (scores.length === 0) {
    return {
      reasonType: "new_competency",
      targetCompetency: "general",
      targetDifficulty: "medium",
      reason: "Starting session — introducing first competency",
    };
  }

  const lastScore = scores[scores.length - 1];
  const lastCompetency = competencies[competencies.length - 1] ?? "general";
  const lastDifficulty = difficulties[difficulties.length - 1] ?? "medium";
  const difficultyShift = assessDifficultyShift(scores);
  const nextDifficulty = shiftDifficulty(lastDifficulty, difficultyShift);
  const exploreNew = shouldExploreNewCompetency(scores, competencies);

  // Consistently strong → move to new competency area
  if (exploreNew) {
    return {
      reasonType: "new_competency",
      targetCompetency: "general",
      targetDifficulty: nextDifficulty,
      reason: `Consistent strong performance (avg ≥85) on ${lastCompetency} — exploring new area`,
    };
  }

  // Weak answer → recovery question
  if (lastScore < 30) {
    return {
      reasonType: "easier_recovery",
      targetCompetency: lastCompetency,
      targetDifficulty: "easy",
      reason: `Weak answer (${lastScore}/100) — foundational recovery question on ${lastCompetency}`,
    };
  }

  // Score 30–69 → targeted follow-up or weakness drill
  if (lastScore < 70) {
    return {
      reasonType: difficultyShift === "easier" ? "weakness_drill" : "deeper_follow_up",
      targetCompetency: lastCompetency,
      targetDifficulty: nextDifficulty,
      reason: `Partial answer (${lastScore}/100) — drilling ${lastCompetency} at ${nextDifficulty} difficulty`,
    };
  }

  // Score 70–84 → deeper follow-up
  if (lastScore < 85) {
    return {
      reasonType: "deeper_follow_up",
      targetCompetency: lastCompetency,
      targetDifficulty: nextDifficulty,
      reason: `Good answer (${lastScore}/100) — going deeper on ${lastCompetency}`,
    };
  }

  // Score >= 85 → harder same competency before moving on
  return {
    reasonType: "deeper_follow_up",
    targetCompetency: lastCompetency,
    targetDifficulty: nextDifficulty,
    reason: `Strong answer (${lastScore}/100) — advancing difficulty on ${lastCompetency}`,
  };
}
