// AII1/src/app/components/settings/AiProviderSettings.tsx
// BYOK (Bring Your Own Key) AI provider settings UI.
//
// Security & UX rules enforced:
//  - API key input is type="password" with show/hide toggle — never shown in plaintext after submit
//  - After save, only key_last4 (masked as ••••••••••••A1B2) is displayed
//  - The key value is cleared from input state immediately after submission
//  - Never pre-fills the input with a real key (only shows mask)
//  - All API calls go through apiFetch which attaches the user's JWT
//  - Validation is separate from saving: users test their key first (returning VALID,
//    INVALID, QUOTA_EXCEEDED, BILLING_REQUIRED, BLOCKED, NETWORK_ERROR)

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../../lib/api";
import {
  Key, Shield, CheckCircle2, XCircle, Loader2,
  Trash2, RefreshCw, Eye, EyeOff, ExternalLink,
  AlertCircle, Zap, Lock, Info, Check
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderRecord {
  id: string;
  provider: string;
  key_last4: string;
  status: "valid" | "invalid" | "untested";
  last_verified_at: string | null;
}

interface ValidationResponse {
  status: "VALID" | "INVALID" | "QUOTA_EXCEEDED" | "BILLING_REQUIRED" | "BLOCKED" | "NETWORK_ERROR";
  message: string;
  keyLast4?: string;
}

interface AiProviderSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(last4: string): string {
  return `••••••••••••${last4}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GOOGLE_AI_STUDIO_URL = "https://aistudio.google.com/app/apikey";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProviderRecord["status"] }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
        <CheckCircle2 size={11} />
        Connected
      </span>
    );
  }
  if (status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/25">
        <XCircle size={11} />
        Invalid Key
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
      <AlertCircle size={11} />
      Untested
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiProviderSettings({ onBack }: AiProviderSettingsProps) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingNewKey, setTestingNewKey] = useState(false);
  const [testedKeyVal, setTestedKeyVal] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [testingSaved, setTestingSaved] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const selectedProvider = "gemini";

  // ── Load saved providers ───────────────────────────────────────────────────

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ providers: ProviderRecord[] }>("/api/ai/providers");
      setProviders(data.providers ?? []);
    } catch {
      setMessage({ type: "error", text: "Failed to load AI provider status." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const showMsg = (type: "success" | "error" | "info", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  // ── Test un-saved key ──────────────────────────────────────────────────────

  const handleTestNewKey = async () => {
    if (!apiKey.trim()) {
      showMsg("error", "Please enter a Gemini API key to test.");
      return;
    }
    setTestingNewKey(true);
    setValidationResult(null);
    try {
      const res = await apiFetch<ValidationResponse>("/api/ai/credentials/validate", {
        method: "POST",
        body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() }),
      });
      setValidationResult(res);
      setTestedKeyVal(apiKey.trim());

      if (res.status === "VALID") {
        showMsg("success", "API key is valid! You can now click 'Save API Key'.");
      } else {
        showMsg("error", res.message || `API key validation failed (${res.status}).`);
      }
    } catch (err) {
      showMsg("error", (err as Error).message || "Failed to validate key.");
    } finally {
      setTestingNewKey(false);
    }
  };

  // ── Save a validated key ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showMsg("error", "Please enter your API key.");
      return;
    }
    // Check if the current key has been tested
    if (testedKeyVal !== apiKey.trim() || validationResult?.status !== "VALID") {
      showMsg("info", "Please test your API key first to verify it works.");
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<{
        provider: string;
        keyLast4: string;
        status: string;
        message: string;
      }>("/api/ai/credentials", {
        method: "POST",
        body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() }),
      });

      // Clear key from state immediately after submission — never keep plaintext in memory
      setApiKey("");
      setTestedKeyVal(null);
      setValidationResult(null);
      setShowKey(false);

      if (result.status === "valid") {
        showMsg("success", "Gemini API key encrypted and saved successfully!");
      } else {
        showMsg("error", result.message || "Key saved but validation could not be confirmed.");
      }
      await loadProviders();
    } catch (err) {
      showMsg("error", (err as Error).message || "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  };

  // ── Test an existing saved key ─────────────────────────────────────────────

  const handleTestSaved = async (provider: string) => {
    setTestingSaved(provider);
    try {
      const result = await apiFetch<{ status: string; validationStatus?: string; message?: string }>(
        `/api/ai/credentials/${provider}/test`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      showMsg(
        result.status === "valid" ? "success" : "error",
        result.status === "valid"
          ? "Saved API key is working correctly."
          : (result.message || "API key test failed. The key may have expired or exceeded quota.")
      );
      await loadProviders();
    } catch (err) {
      showMsg("error", (err as Error).message || "Test failed.");
    } finally {
      setTestingSaved(null);
    }
  };

  // ── Delete a key ──────────────────────────────────────────────────────────

  const handleDelete = async (provider: string) => {
    if (!confirm("Remove your saved Gemini API key? The system will revert to the platform AI key.")) return;
    setDeleting(provider);
    try {
      await apiFetch(`/api/ai/credentials/${provider}`, { method: "DELETE" });
      showMsg("success", "API key removed. Platform key will be used instead.");
      await loadProviders();
    } catch (err) {
      showMsg("error", (err as Error).message || "Failed to remove key.");
    } finally {
      setDeleting(null);
    }
  };

  const savedProvider = providers.find((p) => p.provider === selectedProvider);
  const isCurrentKeyTestedAndValid = testedKeyVal === apiKey.trim() && validationResult?.status === "VALID";

  return (
    <div className="min-h-screen bg-[#060d1f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors cursor-pointer"
            aria-label="Back"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center">
              <Key size={16} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">AI / Gemini Settings</h1>
              <p className="text-xs text-white/40">Connect your personal Gemini API key (BYOK)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Toast notification */}
        {message && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium animate-fade-in ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : message.type === "info"
                ? "bg-blue-500/10 border-blue-500/25 text-blue-300"
                : "bg-red-500/10 border-red-500/25 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : message.type === "info" ? (
              <Info size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Title & introduction */}
        <div>
          <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-white mb-2">Connect Gemini AI</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Some AI features require a Gemini API key. You can create your own key through Google AI Studio.
            Connecting your personal key gives you higher rate limits and ensures uninterrupted practice.
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="rounded-2xl bg-white/4 border border-white/8 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              How to obtain your Gemini API key
            </h3>
            <a
              href={GOOGLE_AI_STUDIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
            >
              Open Google AI Studio <ExternalLink size={12} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <div>
                <strong className="text-white block font-medium">Open Google AI Studio</strong>
                <a
                  href={GOOGLE_AI_STUDIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline mt-0.5 inline-block"
                >
                  aistudio.google.com/app/apikey ↗
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <div>
                <strong className="text-white block font-medium">Sign in</strong>
                <span className="text-white/50">Log in with your existing Google account.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <div>
                <strong className="text-white block font-medium">Open API Keys</strong>
                <span className="text-white/50">Navigate to the API Keys section on the left sidebar.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
              <div>
                <strong className="text-white block font-medium">Create API key</strong>
                <span className="text-white/50">Click "Create API key" and select your project.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">5</span>
              <div>
                <strong className="text-white block font-medium">Copy your key</strong>
                <span className="text-white/50">Copy the string starting with <code className="bg-black/30 px-1 py-0.5 rounded text-white/70">AIza...</code></span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/6 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">6</span>
              <div>
                <strong className="text-white block font-medium">Paste &amp; Test below</strong>
                <span className="text-white/50">Paste it below, test validation, and save.</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-white/40 border-t border-white/6 flex items-center gap-1.5">
            <Info size={12} className="shrink-0 text-white/40" />
            <span>Note: Gemini usage quotas, rate limits, and billing tiers depend on Google's current API policies and your Google Cloud project setup.</span>
          </div>
        </div>

        {/* Active connection card */}
        <div className="rounded-2xl bg-white/4 border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/25 flex items-center justify-center font-bold text-blue-300">
                G
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Google Gemini</div>
                <div className="text-xs text-white/40">Model: gemini-2.5-flash</div>
              </div>
            </div>
            {loading ? (
              <Loader2 size={16} className="text-white/30 animate-spin" />
            ) : savedProvider ? (
              <StatusBadge status={savedProvider.status} />
            ) : (
              <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                Using platform key
              </span>
            )}
          </div>

          {/* Connected state summary */}
          {savedProvider && (
            <div className="px-6 py-4 border-b border-white/6 bg-white/2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Active Key</div>
                <div className="font-mono text-sm text-emerald-400 tracking-wider">
                  {maskKey(savedProvider.key_last4)}
                </div>
                <div className="text-xs text-white/40">
                  Last verified: {formatDate(savedProvider.last_verified_at)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestSaved(savedProvider.provider)}
                  disabled={!!testingSaved}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                >
                  {testingSaved === savedProvider.provider ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Test Key
                </button>
                <button
                  onClick={() => handleDelete(savedProvider.provider)}
                  disabled={!!deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deleting === savedProvider.provider ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Key Input Section */}
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="gemini-api-key-input" className="block text-xs font-medium text-white/60 mb-2">
                {savedProvider ? "Replace with new Gemini API Key:" : "Enter your Gemini API Key:"}
              </label>
              <div className="relative">
                <input
                  id="gemini-api-key-input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (testedKeyVal !== e.target.value.trim()) {
                      setValidationResult(null);
                    }
                  }}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 pr-20 text-sm text-white placeholder:text-white/25 font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Validation feedback card */}
            {validationResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  validationResult.status === "VALID"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                    : "bg-red-500/10 border-red-500/25 text-red-300"
                }`}
              >
                {validationResult.status === "VALID" ? (
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-semibold">
                    Status: {validationResult.status}
                  </strong>
                  <span>{validationResult.message}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <a
                href={GOOGLE_AI_STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={12} />
                Get API key from Google AI Studio
              </a>

              <div className="flex items-center gap-2">
                <button
                  id="test-api-key-btn"
                  type="button"
                  onClick={handleTestNewKey}
                  disabled={testingNewKey || !apiKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white text-xs font-semibold border border-white/12 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {testingNewKey ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {testingNewKey ? "Testing Key..." : "Test API Key"}
                </button>

                <button
                  id="save-api-key-btn"
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isCurrentKeyTestedAndValid}
                  title={!isCurrentKeyTestedAndValid ? "Please test your API key successfully before saving" : "Save key"}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {saving ? "Saving…" : "Save API Key"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security architecture highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/50">
          <div className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-medium">
              <Zap size={14} className="text-blue-400" /> AES-256-GCM
            </div>
            <p>Your key is encrypted server-side with an isolated key before being written to disk.</p>
          </div>

          <div className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-medium">
              <Lock size={14} className="text-blue-400" /> Never Logged
            </div>
            <p>Only the last 4 characters are ever displayed or referenced. Plaintext is never stored in browser storage.</p>
          </div>

          <div className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-medium">
              <Shield size={14} className="text-blue-400" /> Instant Revocation
            </div>
            <p>You can disconnect or replace your key at any time. When deleted, all encrypted copies are erased.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
