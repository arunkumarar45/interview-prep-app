// server/lib/ai/AIProvider.ts
// Abstract interface every AI provider must implement.
// New providers (OpenAI, Anthropic) only need to implement this interface.

export interface AICallOptions {
  operation: string;        // e.g. "interview/question", "quiz/generate"
  timeoutMs?: number;       // default 30_000
}

export interface AIProvider {
  /**
   * Call the AI model with a prompt and parse the response as JSON.
   * Throws on error, timeout, or invalid JSON after retries.
   */
  generateJSON<T>(prompt: string, options?: AICallOptions): Promise<T>;

  /** Provider identifier, e.g. "gemini" */
  readonly provider: string;

  /** Model identifier, e.g. "gemini-2.5-flash" */
  readonly model: string;
}
