// AII1/src/app/components/auth/ResetPasswordScreen.tsx
// Dedicated Password Reset Screen for recovery sessions.
// Handles:
// - New password input with Show/Hide toggle
// - Confirm password input
// - Mismatched passwords check
// - Weak password check (minimum 8 characters, letters + numbers)
// - Supabase updateUser({ password })
// - Success confirmation with transition to dashboard or login
// - Expired/invalid recovery session error with retry link

import { useState } from "react";
import {
  Brain, Lock, CheckCircle2, AlertCircle, Eye, EyeOff,
  Loader2, ArrowRight
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ResetPasswordScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResetPasswordScreen({ onSuccess, onCancel }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation: password length & strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain both letters and numbers.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.toLowerCase().includes("session") || updateError.message.toLowerCase().includes("expired")) {
          setError("Your password reset link has expired or is invalid. Please request a new reset email.");
        } else {
          setError(updateError.message || "Failed to update password. Please try again.");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d1f] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-[#0a1428] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-white text-base">
            InterviewPrep AI
          </span>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4 animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-white">Password Updated!</h2>
            <p className="text-xs text-white/60">
              Your password has been changed successfully. Redirecting you to your account...
            </p>
            <button
              onClick={onSuccess}
              className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Continue to Dashboard <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-white mb-1.5">
              Reset Your Password
            </h2>
            <p className="text-xs text-white/50 mb-6">
              Enter and confirm your new secure password below.
            </p>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 chars (letters & numbers)"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm New Password</label>
                <input
                  id="confirm-password-input"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  id="save-new-password-btn"
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      Set New Password
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  Cancel and return to sign in
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
