// routes/interview.ts
// POST /api/interview/question  — generate the next interview question (adaptive + blueprint)
// POST /api/interview/evaluate  — score answer against blueprint (technical or HR evaluator)
// POST /api/interview/save      — persist completed session to interview_sessions
//
// Security:
//  - Runtime input validation on all fields.
//  - Prompt injection defense: user content wrapped in DATA markers.
//  - History array limited to 20 entries to prevent prompt bloat.
//  - User answer length limited to 3000 characters.
//  - Blueprint expectedConcepts NEVER sent to client (server-side only).
//  - Server re-computes aggregate scores; never trusts client-provided values.

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "../lib/supabase";
import { generateQuestion } from "../lib/questionEngine";
import type { SessionState } from "../lib/questionEngine";
import { evaluateTechnical } from "../evaluation/technicalEvaluator";
import { evaluateHR } from "../evaluation/hrEvaluator";
import type { QuestionBlueprint } from "../lib/questionBlueprint";
import { resolveMisconception } from "../lib/masteryEngine";

const router = Router();

const VALID_MODES = new Set(["technical", "hr", "project", "resume"]);
const MAX_ANSWER_LENGTH = 3_000;
const MAX_HISTORY_ENTRIES = 20;
const MAX_QUESTION_LENGTH = 1_000;
const MAX_TOPIC_LENGTH = 100;

// Rate limit for misconception resolve — user action, not AI, so 30/15min is generous
const misconceptionResolveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.userId ?? req.ip ?? "unknown",
  message: {
    error: { code: "RATE_LIMITED", message: "Too many resolve requests. Please wait before trying again." },
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  question: string;
  answer: string;
}

export interface TranscriptEntry {
  question: string;
  answer: string;
  questionId?: string;
  overallScore: number;
  technicalScore?: number;
  communicationScore?: number;
  feedback: string[];
  [key: string]: unknown;
}

// ─── POST /api/interview/question ─────────────────────────────────────────────
// Returns: { question, questionId, category, subtopic, difficulty }
// questionId links this question to its blueprint for evaluation.
// Client must pass questionId back in the /evaluate call.

router.post(
  "/question",
  async (req: Request, res: Response): Promise<void> => {
    const { mode, topic, history = [], resumeText } = req.body as {
      mode?: unknown;
      topic?: unknown;
      history?: unknown;
      resumeText?: unknown;
    };

    // Runtime validation
    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      res.status(400).json({ error: "mode must be one of: technical, hr, project, resume" });
      return;
    }
    if (topic !== undefined && (typeof topic !== "string" || topic.length > MAX_TOPIC_LENGTH)) {
      res.status(400).json({ error: `topic must be a string under ${MAX_TOPIC_LENGTH} characters` });
      return;
    }
    if (!Array.isArray(history)) {
      res.status(400).json({ error: "history must be an array" });
      return;
    }

    const safeMode = mode as "technical" | "hr" | "project" | "resume";
    const safeTopic = typeof topic === "string" ? topic.trim().slice(0, MAX_TOPIC_LENGTH) : "";
    const safeResumeText = typeof resumeText === "string" ? resumeText.slice(0, 8000) : undefined;

    // Extract recent questions + session state from history for adaptive engine
    const typedHistory = (history as Array<HistoryEntry & {
      overallScore?: number;
      technicalScore?: number;
      competency?: string;
      difficulty?: string;
    }>).slice(0, MAX_HISTORY_ENTRIES);

    const recentQuestions = typedHistory
      .filter((h) => typeof h?.question === "string")
      .map((h) => h.question.slice(0, MAX_QUESTION_LENGTH));

    // Build session state for adaptive engine
    const sessionState: SessionState = {
      scores: typedHistory
        .map((h) => h.overallScore ?? h.technicalScore ?? -1)
        .filter((s): s is number => s >= 0),
      competencies: typedHistory
        .map((h) => h.competency ?? "general")
        .filter((_, i) => (typedHistory[i].overallScore ?? typedHistory[i].technicalScore ?? -1) >= 0),
      difficulties: typedHistory
        .map((h) => (h.difficulty as SessionState["difficulties"][number]) ?? "medium")
        .filter((_, i) => (typedHistory[i].overallScore ?? typedHistory[i].technicalScore ?? -1) >= 0),
      lastQuestionId: null,
    };

    try {
      const { blueprint, adaptiveContext } = await generateQuestion(
        req.userId,
        safeMode,
        safeTopic || "general",
        recentQuestions,
        sessionState,
        safeResumeText
      );

      // Return: question text + metadata for client, questionId for evaluation linkage
      // NEVER return expectedConcepts, rubric, or commonMistakes to the client
      res.json({
        question: blueprint.questionText,
        questionId: blueprint.questionId,
        category: blueprint.category,
        subtopic: blueprint.subtopic,
        difficulty: blueprint.difficulty,
        questionType: blueprint.questionType,
        adaptiveReason: adaptiveContext.reason,
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "interview/question",
          message: (err as Error).message?.slice(0, 200),
          requestId: req.requestId,
        })
      );
      res.status(502).json({ error: "Failed to generate interview question. Please try again." });
    }
  }
);

// ─── POST /api/interview/evaluate ─────────────────────────────────────────────
// Evaluates the user's answer against the blueprint (fetched from question_bank).
// Branches: technical/project → TechnicalEvaluator; hr → HREvaluator.
// Returns evaluation result + triggers async competency score + misconception updates.

router.post(
  "/evaluate",
  async (req: Request, res: Response): Promise<void> => {
    const { question, userAnswer, mode = "technical", questionId } = req.body as {
      question?: unknown;
      userAnswer?: unknown;
      mode?: unknown;
      questionId?: unknown;
    };

    // Runtime validation
    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "question must be a non-empty string" });
      return;
    }
    if (typeof userAnswer !== "string" || !userAnswer.trim()) {
      res.status(400).json({ error: "userAnswer must be a non-empty string" });
      return;
    }
    if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
      res.status(400).json({ error: "mode must be one of: technical, hr, project, resume" });
      return;
    }

    const safeQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
    const safeAnswer = userAnswer.trim().slice(0, MAX_ANSWER_LENGTH);
    const safeMode = mode as "technical" | "hr" | "project" | "resume";

    // Fetch blueprint from question_bank if questionId was provided
    let blueprint: QuestionBlueprint | null = null;
    if (typeof questionId === "string" && questionId.trim()) {
      const { data } = await supabaseAdmin
        .from("question_bank")
        .select("*")
        .eq("id", questionId.trim())
        .maybeSingle();

      if (data) {
        blueprint = {
          questionId: data.id as string,
          domain: data.domain as QuestionBlueprint["domain"],
          category: data.category as string,
          subtopic: data.subtopic as string,
          difficulty: data.difficulty as QuestionBlueprint["difficulty"],
          questionType: data.question_type as QuestionBlueprint["questionType"],
          questionText: data.question_text as string,
          expectedConcepts: (data.expected_concepts as string[]) ?? [],
          commonMistakes: (data.common_mistakes as string[]) ?? [],
          rubric: (data.rubric as QuestionBlueprint["rubric"]) ?? [],
          sourceEvidence: (data.source_evidence as QuestionBlueprint["sourceEvidence"]) ?? [],
          modelVersion: data.model_version as string,
          promptVersion: data.prompt_version as string,
        };
      }
    }

    try {
      // Branch evaluators based on mode
      if (safeMode === "hr") {
        const evaluation = await evaluateHR(
          req.userId,
          safeQuestion,
          safeAnswer,
          blueprint
        );
        res.json(evaluation);
      } else {
        // technical or project
        const evaluation = await evaluateTechnical(
          req.userId,
          safeQuestion,
          safeAnswer,
          safeMode,
          blueprint
        );
        res.json(evaluation);
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "interview/evaluate",
          message: (err as Error).message?.slice(0, 200),
          requestId: req.requestId,
        })
      );
      res.status(502).json({ error: "Failed to evaluate answer. Please try again." });
    }
  }
);

// ─── POST /api/interview/save ─────────────────────────────────────────────────
// Server re-computes average scores from transcript rather than trusting
// client-provided aggregate scores.

router.post("/save", async (req: Request, res: Response): Promise<void> => {
  const { mode, topic, transcript } = req.body as {
    mode?: unknown;
    topic?: unknown;
    transcript?: unknown;
  };

  // Runtime validation
  if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
    res.status(400).json({ error: "mode must be one of: technical, hr, project" });
    return;
  }
  if (!Array.isArray(transcript)) {
    res.status(400).json({ error: "transcript must be an array" });
    return;
  }
  if (transcript.length === 0) {
    res.status(400).json({ error: "transcript must not be empty" });
    return;
  }
  if (transcript.length > 50) {
    res.status(400).json({ error: "transcript must not exceed 50 entries" });
    return;
  }

  // Server-computed aggregate scores from transcript
  // For HR sessions: use overallScore. For technical: use overallScore.
  // Falls back to technicalScore/communicationScore for backward compat.
  let techSum = 0;
  let commSum = 0;
  let validCount = 0;

  for (const entry of transcript as Array<{
    overallScore?: unknown;
    technicalScore?: unknown;
    communicationScore?: unknown;
  }>) {
    const overall = Number(entry?.overallScore);
    const tech = Number(entry?.technicalScore);
    const comm = Number(entry?.communicationScore);

    if (!Number.isNaN(overall) && overall >= 0) {
      techSum += Math.max(0, Math.min(100, overall));
      commSum += Math.max(0, Math.min(100, overall));
      validCount++;
    } else if (!Number.isNaN(tech) && !Number.isNaN(comm)) {
      techSum += Math.max(0, Math.min(100, tech));
      commSum += Math.max(0, Math.min(100, comm));
      validCount++;
    }
  }

  const serverTechScore = validCount > 0 ? Math.round(techSum / validCount) : 0;
  const serverCommScore = validCount > 0 ? Math.round(commSum / validCount) : 0;

  try {
    const { data, error } = await supabaseAdmin
      .from("interview_sessions")
      .insert({
        user_id: req.userId,
        mode,
        topic: typeof topic === "string" ? topic.trim().slice(0, MAX_TOPIC_LENGTH) : null,
        technical_score: serverTechScore,
        communication_score: serverCommScore,
        transcript,
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "interview/save",
          supabaseError: error.message,
          requestId: req.requestId,
        })
      );
      throw error;
    }

    res.json({ saved: true, sessionId: data?.id });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        route: "interview/save",
        message: (err as Error).message?.slice(0, 200),
        requestId: req.requestId,
      })
    );
    res.status(500).json({ error: "Failed to save interview session" });
  }
});

// ─── POST /api/interview/misconception/:id/resolve ───────────────────────────
// Marks a misconception as resolved (user understood/corrected it manually).
//
// Security:
//  - Ownership verified: only the owning user can resolve their own misconception
//  - Returns 404 (not 403) for both missing and wrong-owner cases — avoids
//    disclosing whether a misconception exists to other users
//  - Never accepts user_id from request body — always from req.userId (JWT)
//  - Rate-limited: 30 per 15 minutes per user

router.post(
  "/misconception/:id/resolve",
  misconceptionResolveLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.userId;

    // Validate ID format (must be a UUID)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({ error: "Invalid misconception ID" });
      return;
    }

    // Fetch the record — verify ownership and check if already resolved
    const { data: record, error: fetchError } = await supabaseAdmin
      .from("misconceptions")
      .select("id, user_id, resolved")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "POST misconception/:id/resolve",
          message: fetchError.message?.slice(0, 200),
          requestId: req.requestId,
        })
      );
      res.status(500).json({ error: "Failed to look up misconception" });
      return;
    }

    // 404 for both missing and wrong-owner cases (avoids information leakage)
    if (!record || record.user_id !== userId) {
      res.status(404).json({ error: "Misconception not found" });
      return;
    }

    // 409 if already resolved
    if (record.resolved === true) {
      res.status(409).json({ error: "Misconception is already resolved" });
      return;
    }

    try {
      await resolveMisconception(id, userId);

      console.log(
        JSON.stringify({
          level: "INFO",
          route: "POST misconception/:id/resolve",
          message: "Misconception resolved",
          requestId: req.requestId,
        })
      );

      res.json({ success: true, id, resolved: true });
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "POST misconception/:id/resolve",
          message: (err as Error).message?.slice(0, 200),
          requestId: req.requestId,
        })
      );
      res.status(500).json({ error: "Failed to resolve misconception" });
    }
  }
);

export default router;
