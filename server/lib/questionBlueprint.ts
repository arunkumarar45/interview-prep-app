// server/lib/questionBlueprint.ts
// Shared types for the question engine and evaluators.
// These types flow from question generation → evaluation → mastery engine.

export type InterviewDomain = "technical" | "hr" | "project" | "resume";

export type Difficulty =
  | "easy"
  | "medium"
  | "hard"
  | "scenario"
  | "architecture";

export type QuestionType =
  | "conceptual"
  | "scenario"
  | "debugging"
  | "coding"
  | "system_design"
  | "trade_off"
  | "security"
  | "performance";

export type AdaptiveReasonType =
  | "misconception_remediation"
  | "weakness_drill"
  | "deeper_follow_up"
  | "new_competency"
  | "easier_recovery";

export type MasteryLevel =
  | "weak"
  | "developing"
  | "competent"
  | "strong"
  | "mastered";

export interface RubricItem {
  concept: string;
  weight: number;  // weights across all rubric items must sum to 100
}

export interface SourceEvidence {
  file: string;
  snippet: string;  // actual code/text from the file that grounds this question
}

/**
 * A QuestionBlueprint is the ground-truth model for what a correct answer
 * should contain. It drives the Technical Evaluator's scoring.
 *
 * - expectedConcepts: 3–7 specific concepts the answer MUST cover
 * - commonMistakes: known misconceptions to watch for
 * - rubric: weighted scoring criteria (weights must sum to 100)
 * - sourceEvidence: for project questions — file snippets that ground the question
 */
export interface QuestionBlueprint {
  questionId: string;         // uuid — stored in question_bank
  domain: InterviewDomain;
  category: string;           // e.g. "Databases", "Operating Systems", "Soft Skills"
  subtopic: string;           // e.g. "Indexing", "Deadlocks", "STAR Framework"
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  expectedConcepts: string[];   // 3–7 items; evaluator checks answer covers these
  commonMistakes: string[];     // Evaluator flags these if detected
  rubric: RubricItem[];         // weights sum to 100
  sourceEvidence: SourceEvidence[];  // only populated for project-mode questions
  modelVersion: string;         // Gemini model used to generate this blueprint
  promptVersion: string;        // version string for the generation prompt
}

/**
 * Context the adaptive engine provides to the question engine before generation.
 * Tells the engine WHAT to ask about and WHY (for principled adaptation).
 */
export interface AdaptiveContext {
  reasonType: AdaptiveReasonType;
  targetCompetency: string;
  targetSubtopic?: string;
  targetDifficulty: Difficulty;
  reason: string;              // Human-readable explanation (for debugging)
  unresolvedMisconception?: {  // Populated when remediation target
    incorrectBelief: string;
    correction: string;
  };
}

/**
 * Full response from the question engine — blueprint + adaptive context.
 * The route handler returns `blueprint.questionText` to the client;
 * the blueprint is stored server-side for evaluation.
 */
export interface GeneratedQuestion {
  blueprint: QuestionBlueprint;
  adaptiveContext: AdaptiveContext;
}

/**
 * A competency score record for one user+domain+competency combination.
 */
export interface CompetencyScore {
  userId: string;
  domain: InterviewDomain;
  competency: string;
  attempts: number;
  lastScore: number;          // 0–100
  recentScores: number[];     // last 3 scores for consistency check
  masteryLevel: MasteryLevel;
}

/**
 * An unresolved misconception for a user.
 */
export interface UnresolvedMisconception {
  id: string;
  domain: InterviewDomain;
  competency: string;
  incorrectBelief: string;
  correction: string;
}
