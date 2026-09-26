// AII1/src/lib/scoring.ts
// Canonical quiz scoring implementation.
// Single source of truth across Dashboard, History, and Quiz Results screens.
//
// Rules:
//  - Evaluates MCQ questions against q.correct (0-based index)
//  - Handles unanswered questions cleanly (userAnswer with null or missing index = incorrect)
//  - Computes exact correct count, graded total, and percentage (0-100 rounded)
//  - Short answer / text questions are marked ungraded and excluded from percentage denominator
//    unless all questions are text-only

export interface CanonicalQuizQuestion {
  id?: number;
  question: string;
  type?: "mcq" | "text";
  options?: string[];
  correct?: number;
  explanation?: string;
  userAnswer?: { selectedIndex?: number | null; textAnswer?: string };
  ok?: boolean;
}

export interface QuizScoreSummary {
  correct: number;
  total: number;
  percentage: number;
  mcqCount: number;
  textCount: number;
  unansweredCount: number;
}

/**
 * Calculates canonical score for a quiz attempt or active session.
 */
export function calculateQuizScore(attempt: {
  questions?: unknown[];
  score?: number;
  total?: number;
  userAnswers?: Array<{ selectedIndex: number | null; textAnswer: string }>;
}): QuizScoreSummary {
  const rawList = Array.isArray(attempt.questions) ? (attempt.questions as CanonicalQuizQuestion[]) : [];
  const userAnswers = attempt.userAnswers;

  if (rawList.length > 0) {
    let correct = 0;
    let mcqCount = 0;
    let textCount = 0;
    let unansweredCount = 0;

    rawList.forEach((q, i) => {
      const isMcq = q.type === "mcq" || (Array.isArray(q.options) && q.options.length > 0);
      const ans = userAnswers ? userAnswers[i] : q.userAnswer;
      const selectedIndex = ans?.selectedIndex;

      if (isMcq) {
        mcqCount++;
        if (selectedIndex === null || selectedIndex === undefined || selectedIndex < 0) {
          unansweredCount++;
        } else if (typeof q.correct === "number" && selectedIndex === q.correct) {
          correct++;
        } else if (q.ok === true) {
          correct++;
        }
      } else {
        textCount++;
      }
    });

    const gradedTotal = mcqCount > 0 ? mcqCount : rawList.length;
    const finalTotal = Math.max(gradedTotal, 1);
    const percentage = Math.min(100, Math.max(0, Math.round((correct / finalTotal) * 100)));

    return {
      correct,
      total: finalTotal,
      percentage,
      mcqCount,
      textCount,
      unansweredCount,
    };
  }

  // Fallback if questions array is empty (e.g. summarized record from DB)
  const fallbackCorrect = Math.max(0, attempt.score ?? 0);
  const fallbackTotal = Math.max(attempt.total ?? 1, 1);
  const fallbackPct = Math.min(100, Math.round((fallbackCorrect / fallbackTotal) * 100));

  return {
    correct: fallbackCorrect,
    total: fallbackTotal,
    percentage: fallbackPct,
    mcqCount: fallbackTotal,
    textCount: 0,
    unansweredCount: Math.max(0, fallbackTotal - fallbackCorrect),
  };
}
