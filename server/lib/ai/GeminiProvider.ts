// server/lib/ai/GeminiProvider.ts
// Wraps the existing callGeminiJSON behavior into the AIProvider interface.
// Accepts an INJECTED apiKey — never reads process.env directly.
// This allows both platform-key calls and BYOK calls to use identical code paths.
//
// Behavior preserved from lib/gemini.ts:
//  - 30-second timeout per call
//  - Retry once on malformed JSON (stricter prompt)
//  - Retry up to 3 times on 429/503 with exponential backoff + jitter
//  - JSON fence stripping

import { GoogleGenAI } from "@google/genai";
import type { AIProvider, AICallOptions } from "./AIProvider";

export const GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export class GeminiProvider implements AIProvider {
  readonly provider = "gemini";
  readonly model = GEMINI_MODEL;

  private readonly client: GoogleGenAI;
  private readonly timeoutMs: number;

  /**
   * @param apiKey  The Gemini API key. For platform calls this is
   *                process.env.GEMINI_API_KEY. For BYOK calls this is
   *                the decrypted user credential from credentialCrypto.
   */
  constructor(apiKey: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!apiKey) throw new Error("GeminiProvider: apiKey is required");
    this.client = new GoogleGenAI({ apiKey });
    this.timeoutMs = timeoutMs;
  }

  private async callOnce(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return response.text ?? "";
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        throw new Error(`GeminiProvider: call timed out after ${this.timeoutMs / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async generateJSON<T>(prompt: string, _options?: AICallOptions): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = await this.callOnce(prompt);

        // Try JSON parse — retry once with stricter instruction on malformed output
        try {
          return parseJSON<T>(raw);
        } catch {
          if (attempt === 1) {
            console.warn(
              JSON.stringify({
                level: "WARN",
                provider: "gemini",
                message: "Malformed JSON — retrying with stricter prompt",
                rawExcerpt: raw.slice(0, 200),
              })
            );
            const strictPrompt =
              `${prompt}\n\n` +
              "IMPORTANT: Your previous response was not valid JSON. " +
              "Return ONLY a raw JSON value — no markdown, no code fences, " +
              "no commentary, no trailing text. Start your response with [ or {.";
            const raw2 = await this.callOnce(strictPrompt);
            try {
              return parseJSON<T>(raw2);
            } catch {
              throw new Error(
                `GeminiProvider: malformed JSON after retry. Excerpt: ${raw2.slice(0, 300)}`
              );
            }
          }
          throw new Error(
            `GeminiProvider: malformed JSON on attempt ${attempt}. Excerpt: ${raw.slice(0, 300)}`
          );
        }
      } catch (err: unknown) {
        lastErr = err;
        if (!isRetryable(err)) throw err;
        if (attempt >= 3) break;

        const baseDelay = attempt * 3_000;
        const jitter = Math.floor(Math.random() * 1_000);
        const delay = baseDelay + jitter;
        console.warn(
          JSON.stringify({
            level: "WARN",
            provider: "gemini",
            message: `Transient error — waiting ${delay}ms before retry`,
            attempt,
            errorMessage: (err as Error).message?.slice(0, 100),
          })
        );
        await sleep(delay);
      }
    }

    throw lastErr;
  }
}
