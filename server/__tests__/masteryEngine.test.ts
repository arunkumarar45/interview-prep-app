// server/__tests__/masteryEngine.test.ts
// Tests for the mastery level calculation and misconception resolution logic.
// supabaseAdmin is mocked to prevent module load failure when SUPABASE_URL is absent.

// Configurable mock result for resolveMisconception's update().eq().eq() terminal call
let updateResolvedValue: { error: null | { message: string } } = { error: null };

// Must mock supabaseAdmin BEFORE importing masteryEngine
jest.mock("../lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockImplementation(() => Promise.resolve(updateResolvedValue)),
        })),
      })),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

import { calculateMasteryLevel, resolveMisconception } from "../lib/masteryEngine";

// ─── calculateMasteryLevel ────────────────────────────────────────────────────

describe("calculateMasteryLevel", () => {
  // ── Edge cases ────────────────────────────────────────────────────────────

  it("returns 'weak' for empty scores", () => {
    expect(calculateMasteryLevel([], 0)).toBe("weak");
  });

  it("returns 'weak' for zero attempts", () => {
    expect(calculateMasteryLevel([90], 0)).toBe("weak");
  });

  it("returns 'weak' for very low single score", () => {
    expect(calculateMasteryLevel([10], 1)).toBe("weak");
  });

  // ── Single attempt (capped at 'developing') ───────────────────────────────

  it("returns 'developing' not 'strong' for single high score — insufficient data", () => {
    expect(calculateMasteryLevel([90], 1)).toBe("developing");
  });

  it("returns 'weak' for single low score (< 30)", () => {
    expect(calculateMasteryLevel([20], 1)).toBe("weak");
  });

  it("returns 'developing' for single medium score (50+) with 1 attempt", () => {
    expect(calculateMasteryLevel([60], 1)).toBe("developing");
  });

  // ── Two+ attempts — mastery levels accessible ──────────────────────────────

  it("returns 'mastered' for consistently high scores with low stddev", () => {
    // avg = 90, stddev ≈ 0, attempts = 3
    expect(calculateMasteryLevel([90, 90, 90], 3)).toBe("mastered");
  });

  it("returns 'mastered' for avg >= 85 with low stddev and 2+ attempts", () => {
    expect(calculateMasteryLevel([85, 90], 2)).toBe("mastered");
  });

  it("does NOT return 'mastered' when stddev is high (score inconsistency)", () => {
    // avg = 87.5 but stddev is high — candidate is inconsistent
    const level = calculateMasteryLevel([60, 100, 95, 95], 4);
    expect(level).not.toBe("mastered");
  });

  it("returns 'strong' for avg >= 70 with 2+ attempts", () => {
    expect(calculateMasteryLevel([70, 75], 2)).toBe("strong");
  });

  it("returns 'competent' for avg around 55 with 2+ attempts", () => {
    expect(calculateMasteryLevel([50, 60], 2)).toBe("competent");
  });

  it("returns 'developing' for avg around 35 with 2+ attempts", () => {
    expect(calculateMasteryLevel([30, 40], 2)).toBe("developing");
  });

  it("returns 'weak' for avg < 30 with 2+ attempts", () => {
    expect(calculateMasteryLevel([20, 25], 2)).toBe("weak");
  });

  // ── Boundary conditions ────────────────────────────────────────────────────

  it("boundary: exactly 85 avg with low stddev should be mastered", () => {
    expect(calculateMasteryLevel([85, 85, 85], 3)).toBe("mastered");
  });

  it("boundary: avg exactly 70 with 2+ attempts should be strong", () => {
    expect(calculateMasteryLevel([70, 70], 2)).toBe("strong");
  });

  it("boundary: avg exactly 50 with 2+ attempts should be competent", () => {
    expect(calculateMasteryLevel([50, 50], 2)).toBe("competent");
  });

  it("boundary: avg exactly 30 with 2+ attempts should be developing", () => {
    expect(calculateMasteryLevel([30, 30], 2)).toBe("developing");
  });

  // ── Rolling window (only last 3 scores matter) ────────────────────────────

  it("uses only scores passed in (mastery engine caller truncates to last 3)", () => {
    // All 85+ → mastered
    expect(calculateMasteryLevel([90, 88, 92], 3)).toBe("mastered");
  });
});

// ─── resolveMisconception — DB interaction via mocked supabaseAdmin ────────────

describe("resolveMisconception", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateResolvedValue = { error: null };
  });

  it("resolves successfully without throwing when DB succeeds", async () => {
    await expect(
      resolveMisconception("11111111-1111-1111-1111-111111111111", "user-abc")
    ).resolves.toBeUndefined();
  });

  it("throws a typed error when the database returns an error", async () => {
    updateResolvedValue = { error: { message: "DB constraint violation" } };
    await expect(
      resolveMisconception("22222222-2222-2222-2222-222222222222", "user-abc")
    ).rejects.toThrow("masteryEngine: failed to resolve misconception");
  });

  it("calls supabaseAdmin.from('misconceptions') to scope the update", async () => {
    const { supabaseAdmin } = require("../lib/supabase");
    await resolveMisconception("33333333-3333-3333-3333-333333333333", "user-xyz");
    expect(supabaseAdmin.from).toHaveBeenCalledWith("misconceptions");
  });

  it("does not throw when error is null (success path)", async () => {
    updateResolvedValue = { error: null };
    await expect(
      resolveMisconception("44444444-4444-4444-4444-444444444444", "user-abc")
    ).resolves.not.toThrow();
  });
});

// ─── Auto-resolve belief-keyword matching logic ───────────────────────────────
// Pure function version of the belief-overlap check in technicalEvaluator.ts
// Tests are kept here so the logic can be validated without a DB or AI call.

function beliefRepeatedInIncorrectConcepts(
  incorrectBelief: string,
  incorrectConcepts: string[]
): boolean {
  const beliefTerms = incorrectBelief
    .toLowerCase()
    .split(/\W+/)
    .filter((w: string) => w.length >= 4);

  return incorrectConcepts.some((ic) => {
    const icLower = ic.toLowerCase();
    const overlapping = beliefTerms.filter((t: string) => icLower.includes(t));
    return overlapping.length >= 2;
  });
}

describe("auto-resolve belief keyword matching", () => {
  it("detects belief repetition when 2+ key terms overlap", () => {
    const belief = "HashMap is thread-safe for concurrent operations";
    const incorrectConcepts = ["HashMap is thread-safe for multithreaded use"];
    expect(beliefRepeatedInIncorrectConcepts(belief, incorrectConcepts)).toBe(true);
  });

  it("does NOT detect repetition for only a single overlapping term", () => {
    const belief = "HashMap is thread-safe for concurrent operations";
    // Only 'hashmap' overlaps
    const incorrectConcepts = ["HashMap lookup is O(n) in all cases"];
    expect(beliefRepeatedInIncorrectConcepts(belief, incorrectConcepts)).toBe(false);
  });

  it("returns false when candidate has no incorrectConcepts (clean answer)", () => {
    const belief = "HashMap is thread-safe";
    expect(beliefRepeatedInIncorrectConcepts(belief, [])).toBe(false);
  });

  it("returns false for completely unrelated incorrectConcepts", () => {
    const belief = "processes and threads share the same memory space";
    const incorrectConcepts = ["stack and heap are the same"];
    expect(beliefRepeatedInIncorrectConcepts(belief, incorrectConcepts)).toBe(false);
  });

  it("filters out short words (< 4 chars) that would create false overlaps", () => {
    // 'is', 'a', 'not' are all < 4 chars — should not count
    const belief = "OS is a not thread safe";
    const incorrectConcepts = ["OS is not safe"];
    // Only 'safe' overlaps (4 chars), not enough for 2+
    expect(beliefRepeatedInIncorrectConcepts(belief, incorrectConcepts)).toBe(false);
  });

  it("detects overlap case-insensitively", () => {
    const belief = "Deadlock requires Circular Wait and Mutual Exclusion";
    const incorrectConcepts = ["DEADLOCK only needs circular wait"];
    // 'deadlock', 'circular', 'wait' all match → >= 2
    expect(beliefRepeatedInIncorrectConcepts(belief, incorrectConcepts)).toBe(true);
  });
});


