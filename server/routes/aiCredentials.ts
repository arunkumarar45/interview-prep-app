// server/routes/aiCredentials.ts
// BYOK AI credential management routes.
//
// GET    /api/ai/providers                  — list user's saved providers (SAFE fields only)
// POST   /api/ai/credentials                — save + validate a new API key
// POST   /api/ai/credentials/:provider/test — test an existing saved key
// DELETE /api/ai/credentials/:provider      — remove a saved key
//
// Security:
//  - All routes require requireAuth (req.userId from verified JWT)
//  - encrypted_secret is NEVER returned in any response (not even the column is selected)
//  - Plaintext key exists only briefly in memory during encrypt/test
//  - key_last4 computed from plaintext BEFORE encryption
//  - Separate rate limit for test endpoint (prevents brute force)
//  - Input validated at runtime (not TypeScript types alone)

import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "../lib/supabase";
import { GeminiProvider } from "../lib/ai/GeminiProvider";
import {
  encryptCredential,
  extractKeyLast4,
  serializeCredential,
  deserializeCredential,
  decryptCredential,
} from "../lib/ai/credentialCrypto";

const router = Router();

const VALID_PROVIDERS = new Set(["gemini"]);
const MAX_KEY_LENGTH = 200;

export type GeminiValidationStatus =
  | "VALID"
  | "INVALID"
  | "QUOTA_EXCEEDED"
  | "BILLING_REQUIRED"
  | "BLOCKED"
  | "NETWORK_ERROR";

export function classifyGeminiError(err: unknown): { status: GeminiValidationStatus; message: string } {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("api_key_invalid") || msg.includes("api key not valid") || msg.includes("invalid api key")) {
    return { status: "INVALID", message: "The API key provided is not valid. Please check your key from Google AI Studio." };
  }
  if (msg.includes("resource_exhausted") || msg.includes("429") || msg.includes("quota")) {
    return { status: "QUOTA_EXCEEDED", message: "API quota exceeded for this Gemini project. Please check Google AI Studio billing/limits." };
  }
  if (msg.includes("billing") || msg.includes("enable billing")) {
    return { status: "BILLING_REQUIRED", message: "Billing or project activation required for this API key in Google Cloud Console." };
  }
  if (msg.includes("permission_denied") || msg.includes("blocked") || msg.includes("forbidden") || msg.includes("403")) {
    return { status: "BLOCKED", message: "API key does not have permission to access Gemini models or is blocked." };
  }
  if (msg.includes("enotfound") || msg.includes("etimedout") || msg.includes("fetch failed") || msg.includes("network")) {
    return { status: "NETWORK_ERROR", message: "Network connection to Google Gemini API failed. Please try again." };
  }
  return { status: "INVALID", message: "Unable to verify Gemini API key. Ensure the key is active in Google AI Studio." };
}

// Stricter rate limit for credential test/save — 20 per 15 min per user
const credentialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.userId ?? req.ip ?? "unknown",
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many credential requests. Please wait before trying again.",
    },
  },
});

// ─── POST /api/ai/credentials/validate ───────────────────────────────────────
// Validates a raw API key without saving it to database.
// Allows users to test their key first before deciding to save.

router.post(
  "/credentials/validate",
  credentialRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { provider = "gemini", apiKey } = req.body as {
      provider?: unknown;
      apiKey?: unknown;
    };

    if (typeof provider !== "string" || !VALID_PROVIDERS.has(provider)) {
      res.status(400).json({ error: `provider must be one of: ${[...VALID_PROVIDERS].join(", ")}` });
      return;
    }
    if (typeof apiKey !== "string" || !apiKey.trim()) {
      res.status(400).json({ error: "apiKey must be a non-empty string" });
      return;
    }
    if (apiKey.length > MAX_KEY_LENGTH) {
      res.status(400).json({ error: `apiKey must be under ${MAX_KEY_LENGTH} characters` });
      return;
    }

    const trimmedKey = apiKey.trim();
    const keyLast4 = extractKeyLast4(trimmedKey);

    try {
      const testProvider = new GeminiProvider(trimmedKey, 10_000);
      await testProvider.generateJSON<{ ok: boolean }>('Return JSON: {"ok":true}');
      res.json({
        status: "VALID",
        message: "Gemini API key is verified and operational.",
        keyLast4,
      });
    } catch (err) {
      const classification = classifyGeminiError(err);
      res.status(200).json({
        status: classification.status,
        message: classification.message,
        keyLast4,
      });
    }
  }
);

// ─── GET /api/ai/providers ───────────────────────────────────────────────────
// Returns safe credential metadata — NEVER returns encrypted_secret.

router.get("/providers", async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from("ai_credentials")
    // Explicitly select ONLY safe columns — never select encrypted_secret
    .select("id, provider, key_last4, status, created_at, last_verified_at")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        route: "ai/providers GET",
        supabaseError: error.message,
        requestId: req.requestId,
      })
    );
    res.status(500).json({ error: "Failed to retrieve AI providers" });
    return;
  }

  res.json({ providers: data ?? [] });
});

// ─── POST /api/ai/credentials ────────────────────────────────────────────────
// Save a new BYOK key. Tests it first. Stores only encrypted form.

router.post(
  "/credentials",
  credentialRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { provider, apiKey } = req.body as {
      provider?: unknown;
      apiKey?: unknown;
    };

    // Runtime validation
    if (typeof provider !== "string" || !VALID_PROVIDERS.has(provider)) {
      res.status(400).json({ error: `provider must be one of: ${[...VALID_PROVIDERS].join(", ")}` });
      return;
    }
    if (typeof apiKey !== "string" || !apiKey.trim()) {
      res.status(400).json({ error: "apiKey must be a non-empty string" });
      return;
    }
    if (apiKey.length > MAX_KEY_LENGTH) {
      res.status(400).json({ error: `apiKey must be under ${MAX_KEY_LENGTH} characters` });
      return;
    }

    const trimmedKey = apiKey.trim();

    // Test the key with a cheap AI call before saving
    let validationStatus: GeminiValidationStatus = "VALID";
    let statusMessage = "API key verified and saved successfully.";
    try {
      const testProvider = new GeminiProvider(trimmedKey, 10_000);
      await testProvider.generateJSON<{ ok: boolean }>(
        'Return exactly: {"ok":true}'
      );
      validationStatus = "VALID";
    } catch (err) {
      const classification = classifyGeminiError(err);
      validationStatus = classification.status;
      statusMessage = classification.message;
    }

    // Compute key_last4 from plaintext BEFORE encryption
    const keyLast4 = extractKeyLast4(trimmedKey);

    // Encrypt the key
    const stored = encryptCredential(trimmedKey);
    const encryptedSecret = serializeCredential(stored);
    // trimmedKey is no longer referenced after this point

    const now = new Date().toISOString();
    const dbStatus = validationStatus === "VALID" ? "valid" : "invalid";

    // Upsert (one row per user+provider)
    const { error: upsertError } = await supabaseAdmin
      .from("ai_credentials")
      .upsert(
        {
          user_id: req.userId,
          provider,
          encrypted_secret: encryptedSecret,
          key_last4: keyLast4,
          status: dbStatus,
          updated_at: now,
          last_verified_at: validationStatus === "VALID" ? now : null,
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "ai/credentials POST",
          supabaseError: upsertError.message,
          requestId: req.requestId,
        })
      );
      res.status(500).json({ error: "Failed to save credential" });
      return;
    }

    // Return only safe metadata — NEVER return the key or ciphertext
    res.status(validationStatus === "VALID" ? 200 : 422).json({
      provider,
      keyLast4,
      status: dbStatus,
      validationStatus,
      lastVerifiedAt: validationStatus === "VALID" ? now : null,
      message: statusMessage,
    });
  }
);

// ─── POST /api/ai/credentials/:provider/test ─────────────────────────────────
// Test an already-saved key (re-verify it's still working).

router.post(
  "/credentials/:provider/test",
  credentialRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;

    if (!VALID_PROVIDERS.has(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    // Fetch existing credential — ONLY the encrypted_secret for decryption
    const { data, error: fetchError } = await supabaseAdmin
      .from("ai_credentials")
      .select("encrypted_secret")
      .eq("user_id", req.userId)
      .eq("provider", provider)
      .maybeSingle();

    if (fetchError || !data) {
      res.status(404).json({ error: `No saved credential found for provider: ${provider}` });
      return;
    }

    // Decrypt in memory
    let plaintext: string;
    try {
      const stored = deserializeCredential(data.encrypted_secret);
      plaintext = decryptCredential(stored);
    } catch {
      res.status(500).json({ error: "Failed to decrypt credential" });
      return;
    }

    // Test with cheap AI call
    let newStatus: "valid" | "invalid" = "invalid";
    let validationStatus: GeminiValidationStatus = "VALID";
    let statusMessage = "API key verified successfully.";
    try {
      const testProvider = new GeminiProvider(plaintext, 10_000);
      await testProvider.generateJSON<{ ok: boolean }>('Return exactly: {"ok":true}');
      newStatus = "valid";
      validationStatus = "VALID";
    } catch (err) {
      newStatus = "invalid";
      const classification = classifyGeminiError(err);
      validationStatus = classification.status;
      statusMessage = classification.message;
    }
    // plaintext no longer referenced

    const now = new Date().toISOString();

    await supabaseAdmin
      .from("ai_credentials")
      .update({
        status: newStatus,
        last_verified_at: newStatus === "valid" ? now : null,
        updated_at: now,
      })
      .eq("user_id", req.userId)
      .eq("provider", provider);

    res.json({
      provider,
      status: newStatus,
      validationStatus,
      message: statusMessage,
      lastVerifiedAt: newStatus === "valid" ? now : null,
    });
  }
);

// ─── DELETE /api/ai/credentials/:provider ────────────────────────────────────
// Remove a user's saved credential. Scoped strictly to req.userId.

router.delete(
  "/credentials/:provider",
  async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;

    if (!VALID_PROVIDERS.has(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    const { error } = await supabaseAdmin
      .from("ai_credentials")
      .delete()
      .eq("user_id", req.userId)   // ownership enforced server-side
      .eq("provider", provider);

    if (error) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          route: "ai/credentials DELETE",
          supabaseError: error.message,
          requestId: req.requestId,
        })
      );
      res.status(500).json({ error: "Failed to delete credential" });
      return;
    }

    res.json({ deleted: true, provider });
  }
);

export default router;
