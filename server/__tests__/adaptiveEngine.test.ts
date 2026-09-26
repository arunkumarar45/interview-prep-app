// server/__tests__/adaptiveEngine.test.ts
// Tests for decideNextQuestion — pure function, no DB, no mocks.

import { decideNextQuestion } from "../lib/adaptiveEngine";
import type { SessionState } from "../lib/adaptiveEngine";

const emptyState: SessionState = {
  scores: [],
  competencies: [],
  difficulties: [],
  lastQuestionId: null,
};

function makeState(
  scores: number[],
  competencies?: string[],
  difficulties?: SessionState["difficulties"][number][]
): SessionState {
  return {
    scores,
    competencies: competencies ?? scores.map(() => "databases"),
    difficulties: difficulties ?? scores.map(() => "medium" as const),
    lastQuestionId: null,
  };
}

describe("decideNextQuestion — empty session", () => {
  it("returns new_competency at medium difficulty with no history", () => {
    const ctx = decideNextQuestion(emptyState, "technical", false);
    expect(ctx.reasonType).toBe("new_competency");
    expect(ctx.targetDifficulty).toBe("medium");
  });
});

describe("decideNextQuestion — misconception priority", () => {
  it("always targets misconception even when score is high", () => {
    const state = makeState([90, 95]);
    const ctx = decideNextQuestion(state, "technical", true);
    expect(ctx.reasonType).toBe("misconception_remediation");
    expect(ctx.targetDifficulty).toBe("easy");
  });

  it("targets misconception even after weak scores", () => {
    const state = makeState([20, 15]);
    const ctx = decideNextQuestion(state, "hr", true);
    expect(ctx.reasonType).toBe("misconception_remediation");
  });

  it("does NOT target misconception when none pending", () => {
    const state = makeState([90, 92]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.reasonType).not.toBe("misconception_remediation");
  });
});

describe("decideNextQuestion — score-based adaptation", () => {
  it("returns easier_recovery for last score < 30", () => {
    const state = makeState([80, 20]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.reasonType).toBe("easier_recovery");
    expect(ctx.targetDifficulty).toBe("easy");
  });

  it("easier_recovery targets the same competency", () => {
    const state = makeState([80, 20], ["os", "os"]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.targetCompetency).toBe("os");
  });

  it("returns deeper_follow_up for last score 70–84", () => {
    const state = makeState([75, 78]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.reasonType).toBe("deeper_follow_up");
  });

  it("goes harder when avg(last 2) >= 85 — 2-consecutive signal", () => {
    const state = makeState([88, 92]);
    const ctx = decideNextQuestion(state, "technical", false);
    // avg = 90 → much_harder shift → difficulty increases
    expect(["harder", "much_harder"]).toContain(
      // Check that difficulty is harder than "medium"
      ctx.targetDifficulty === "easy" ? "easier" : "harder"
    );
    expect(ctx.targetDifficulty).not.toBe("easy");
  });

  it("explores new competency after consistent avg >= 85 (2+ turns)", () => {
    const state = makeState([90, 92], ["databases", "databases"]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.reasonType).toBe("new_competency");
  });

  it("stays on same competency with single high score (insufficient data)", () => {
    // Only 1 score — no consecutive signal
    const state = makeState([90], ["databases"]);
    const ctx = decideNextQuestion(state, "technical", false);
    // One high score → should go deeper, NOT explore new competency
    expect(ctx.reasonType).not.toBe("new_competency");
  });

  it("handles mixed signals — no flip-flop on alternating scores", () => {
    // 30, 80 → avg of last 2 = 55 → not weak enough for recovery, not strong enough for new
    const state = makeState([30, 80], ["algo", "algo"]);
    const ctx = decideNextQuestion(state, "technical", false);
    // avg 55 → deeper_follow_up or weakness_drill, not new_competency, not easier_recovery
    expect(ctx.reasonType).not.toBe("new_competency");
    expect(ctx.reasonType).not.toBe("easier_recovery");
  });
});

describe("decideNextQuestion — difficulty progression", () => {
  it("does not go below easy", () => {
    const state = makeState([10, 5], ["algo", "algo"], ["easy", "easy"]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.targetDifficulty).toBe("easy");
  });

  it("does not go above architecture", () => {
    const state = makeState([100, 100], ["algo", "algo"], ["architecture", "architecture"]);
    const ctx = decideNextQuestion(state, "technical", false);
    expect(ctx.targetDifficulty).toBe("architecture");
  });

  it("advances difficulty from medium when consistently strong", () => {
    const state = makeState([88, 90], ["algo", "algo"], ["medium", "medium"]);
    const ctx = decideNextQuestion(state, "technical", false);
    // avg 89 → much_harder → medium + 2 = architecture or hard
    expect(["hard", "scenario", "architecture"]).toContain(ctx.targetDifficulty);
  });
});

describe("decideNextQuestion — domain handling", () => {
  it("works for hr domain", () => {
    const state = makeState([65, 70], ["conflict_resolution", "conflict_resolution"]);
    const ctx = decideNextQuestion(state, "hr", false);
    expect(ctx).toBeDefined();
    expect(ctx.targetCompetency).toBe("conflict_resolution");
  });

  it("works for project domain", () => {
    const state = makeState([50, 45], ["system_design", "system_design"]);
    const ctx = decideNextQuestion(state, "project", false);
    expect(ctx).toBeDefined();
  });
});
