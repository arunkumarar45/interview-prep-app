// server/lib/gemini.ts
// Shared Gemini AI client — SERVER ONLY. This file never reaches the browser.
//
// callGeminiJSON<T>:
//   - Calls Gemini with responseMimeType: application/json
//   - Enforces a 30-second timeout per call
//   - Strips markdown fences if the model wraps its output
//   - Retries ONCE on malformed JSON (parse error only)
//   - Retries with exponential backoff on transient 429/503 errors (max 3 attempts total)
//   - Does NOT retry on validation failures or permanent errors
//
// Retry budget: JSON parse error = 1 extra attempt total.
//               Network/rate-limit = up to 2 retries (3 attempts total).
//               These budgets are separate and do NOT multiply.

import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
export const MODEL = "gemini-2.5-flash";

// Timeout per individual Gemini call (milliseconds)
const GEMINI_TIMEOUT_MS = 30_000;

/**
 * Returns true for error codes that are worth retrying (transient).
 * Returns false for errors that will not resolve on retry (validation, auth, etc.)
 */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message ?? "";
  const code = (err as Error & { status?: number }).status;
  return (
    code === 429 ||
    code === 503 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("Quota exceeded") ||
    msg.includes("overloaded") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Makes a single Gemini API call with a timeout.
 * Throws on timeout or API error.
 */
async function callGeminiOnce(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return response.text ?? "";
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini call timed out after ${GEMINI_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses raw Gemini output as JSON, stripping markdown code fences if present.
 * Throws SyntaxError if the result is not valid JSON.
 */
function parseGeminiJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Calls Gemini and parses the response as JSON.
 *
 * Retry strategy:
 *   - On JSON parse failure: retry once with an explicit JSON-only instruction.
 *   - On transient network errors (429, 503): up to 2 retries with exponential backoff + jitter.
 *   - Non-retryable errors (auth, permanent): thrown immediately.
 *
 * @param prompt   The full prompt to send to Gemini.
 * @returns        Parsed JSON response typed as T.
 * @throws         Error if all retries are exhausted or a non-retryable error occurs.
 */
export async function callGeminiJSON<T>(prompt: string): Promise<T> {
  // ── Phase 1: Try call with up to 3 attempts for transient network errors ──

  let lastErr: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callGeminiOnce(prompt);

      // ── Phase 2: Try JSON parse; retry once on malformed output ──
      try {
        return parseGeminiJSON<T>(raw);
      } catch {
        if (attempt === 1) {
          // One retry: add explicit JSON instruction to prompt
          console.warn(
            JSON.stringify({
              level: "WARN",
              message: "Gemini returned malformed JSON — retrying with stricter prompt",
              rawExcerpt: raw.slice(0, 200),
            })
          );
          const strictPrompt =
            `${prompt}\n\n` +
            "IMPORTANT: Your previous response was not valid JSON. " +
            "Return ONLY a raw JSON value — no markdown, no code fences, " +
            "no commentary, no trailing text. Start your response with [ or {.";

          const raw2 = await callGeminiOnce(strictPrompt);
          try {
            return parseGeminiJSON<T>(raw2);
          } catch {
            throw new Error(
              `Gemini returned malformed JSON after retry. ` +
                `Raw excerpt: ${raw2.slice(0, 300)}`
            );
          }
        }
        // If this wasn't attempt 1, rethrow parse error (shouldn't happen)
        throw new Error(
          `Gemini returned malformed JSON on attempt ${attempt}. ` +
            `Raw excerpt: ${raw.slice(0, 300)}`
        );
      }
    } catch (err: unknown) {
      lastErr = err;

      if (!isRetryable(err)) {
        // Non-retryable: auth error, bad request, permanent quota, timeout
        throw err;
      }

      if (attempt >= 3) break;

      // Exponential backoff with jitter: 3s, 6s (+ up to 1s random jitter)
      const baseDelay = attempt * 3_000;
      const jitter = Math.floor(Math.random() * 1_000);
      const delay = baseDelay + jitter;

      console.warn(
        JSON.stringify({
          level: "WARN",
          message: `Gemini transient error — waiting ${delay}ms before retry`,
          attempt,
          nextAttempt: attempt + 1,
          errorMessage: (err as Error).message?.slice(0, 100),
        })
      );

      await sleep(delay);
    }
  }

  throw lastErr;
}
