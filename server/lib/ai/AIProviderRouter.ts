// server/lib/ai/AIProviderRouter.ts
// Decides which AI provider to use for a given user.
//
// Resolution order:
//   1. If user has a valid BYOK credential for the requested provider → use it
//   2. Otherwise → use platform key (GEMINI_API_KEY env var)
//
// Security:
//   - Decrypted key exists ONLY in memory during the request
//   - Never returned to any caller beyond the AIProvider instance
//   - Never logged (even on error)
//   - Logs AI usage to ai_usage table after every call

import { supabaseAdmin } from "../supabase";
import { GeminiProvider, GEMINI_MODEL } from "./GeminiProvider";
import type { AIProvider, AICallOptions } from "./AIProvider";
import {
  decryptCredential,
  deserializeCredential,
} from "./credentialCrypto";

const VALID_PROVIDERS = new Set(["gemini", "openai", "anthropic"]);
const DEFAULT_PROVIDER = "gemini";

// Cost estimates per 1M tokens (USD) — Gemini 2.5 Flash approximate pricing
// Update these when pricing changes
const GEMINI_COST_PER_1M_INPUT = 0.075;  // $0.075 / 1M input tokens
const GEMINI_COST_PER_1M_OUTPUT = 0.30;  // $0.30 / 1M output tokens

// Rough token estimation (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Returns an AIProvider for the given user.
 * If the user has a valid BYOK credential for `provider`, uses that.
 * Otherwise falls back to the platform key.
 *
 * The returned provider is a thin wrapper — call generateJSON on it.
 */
export async function getProviderForUser(
  userId: string,
  providerName = DEFAULT_PROVIDER
): Promise<{ provider: AIProvider; isByok: boolean }> {
  if (!VALID_PROVIDERS.has(providerName)) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

  // Only Gemini is implemented currently
  if (providerName !== "gemini") {
    throw new Error(`Provider '${providerName}' is not yet implemented`);
  }

  // Try to fetch user's BYOK credential
  const { data: credential } = await supabaseAdmin
    .from("ai_credentials")
    .select("encrypted_secret, status")
    .eq("user_id", userId)
    .eq("provider", providerName)
    .eq("status", "valid")
    .maybeSingle();

  if (credential?.encrypted_secret) {
    try {
      const stored = deserializeCredential(credential.encrypted_secret);
      const plaintext = decryptCredential(stored);
      // plaintext exists only in this stack frame — not stored, not logged
      return { provider: new GeminiProvider(plaintext), isByok: true };
    } catch (err) {
      // Decryption failure → fall back to platform key
      console.warn(
        JSON.stringify({
          level: "WARN",
          message: "BYOK credential decryption failed — falling back to platform key",
          userId,
          provider: providerName,
          // Do NOT log the error message — it may contain key material
        })
      );
    }
  }

  // Platform key fallback
  const platformKey = process.env.GEMINI_API_KEY;
  if (!platformKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return { provider: new GeminiProvider(platformKey), isByok: false };
}

/**
 * Wraps a provider call with usage logging to ai_usage table.
 * Logs: provider, model, operation, latency, estimated tokens/cost, success/failure.
 * Never logs prompt content, API keys, or user data.
 */
export async function callWithUsageTracking<T>(
  userId: string,
  provider: AIProvider,
  isByok: boolean,
  prompt: string,
  options: AICallOptions
): Promise<T> {
  const startMs = Date.now();
  const inputTokensEst = estimateTokens(prompt);
  let success = true;
  let errorCode: string | undefined;
  let result: T;
  let outputTokensEst = 0;

  try {
    result = await provider.generateJSON<T>(prompt, options);
    outputTokensEst = estimateTokens(JSON.stringify(result));
  } catch (err) {
    success = false;
    errorCode = (err as Error).message?.slice(0, 100);
    throw err;
  } finally {
    const latencyMs = Date.now() - startMs;
    const estimatedCostUsd =
      (inputTokensEst / 1_000_000) * GEMINI_COST_PER_1M_INPUT +
      (outputTokensEst / 1_000_000) * GEMINI_COST_PER_1M_OUTPUT;

    // Fire-and-forget — don't let usage logging block or fail the request
    supabaseAdmin
      .from("ai_usage")
      .insert({
        user_id: userId,
        provider: provider.provider,
        model: provider.model,
        operation: options.operation,
        is_byok: isByok,
        input_tokens: inputTokensEst,
        output_tokens: outputTokensEst,
        latency_ms: latencyMs,
        estimated_cost_usd: estimatedCostUsd,
        success,
        error_code: errorCode ?? null,
      })
      .then(({ error }) => {
        if (error) {
          console.warn(
            JSON.stringify({
              level: "WARN",
              message: "Failed to log AI usage",
              supabaseError: error.message?.slice(0, 100),
            })
          );
        }
      });
  }

  return result!;
}
