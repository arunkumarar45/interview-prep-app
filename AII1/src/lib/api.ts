// src/lib/api.ts
// Typed fetch helper for all /api/* calls.
// Reads the Supabase session token and adds it as "Authorization: Bearer <jwt>"
// so the Express auth middleware can identify the user server-side.
//
// The Gemini API key lives ONLY in server/.env — this file never touches it.

import { supabase } from "./supabase";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// In development, VITE_API_BASE_URL is empty and Vite's dev proxy rewrites
// /api/* → http://localhost:3001, so the key never needs to be set locally.
// In production, set VITE_API_BASE_URL to your backend origin, e.g.:
//   VITE_API_BASE_URL=https://api.myapp.com
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");

function resolveUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function getAuthHeaders(isFormData = false): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  return {
    // Only set Content-Type for JSON — FormData sets its own multipart boundary
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

let isRefreshing = false;

async function handleExpiredSession() {
  await supabase.auth.signOut().catch(() => {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:session-expired", {
        detail: { message: "Your session has expired. Please sign in again." },
      })
    );
  }
}

/**
 * Fetch an /api/* endpoint with the current user's Supabase JWT attached.
 *
 * - Automatically sets Content-Type: application/json for JSON bodies.
 * - For FormData bodies (file uploads) Content-Type is intentionally omitted
 *   so the browser can set the correct multipart boundary.
 * - On 401 Unauthorized: attempts to refresh the Supabase session and retries once.
 *   If still 401, signs out and dispatches 'auth:session-expired' event.
 * - Supports 204 No Content responses safely.
 * - Throws an Error with the server's error message on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  let authHeaders = await getAuthHeaders(isFormData);

  let headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  let response = await fetch(resolveUrl(path), {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized: Attempt token refresh once
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session) {
          authHeaders = await getAuthHeaders(isFormData);
          headers = {
            ...authHeaders,
            ...(options.headers as Record<string, string>),
          };
          response = await fetch(resolveUrl(path), {
            ...options,
            headers,
          });
        }
      } catch {
        // ignore
      } finally {
        isRefreshing = false;
      }
    }

    if (response.status === 401) {
      await handleExpiredSession();
      throw new Error("Your session has expired. Please sign in again.");
    }
  }

  if (!response.ok) {
    // Parse the server's error body if possible; fall back to HTTP status text.
    // Handle both flat { error: string } and nested { error: { message: string } } shapes.
    const body = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    const msg =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.error?.message === "string"
          ? body.error.message
          : `Request to ${path} failed`;
    throw new Error(msg);
  }

  // Handle 204 No Content or zero-length bodies cleanly
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Like apiFetch but returns a raw Blob — for binary responses such as PDF exports.
 * Attaches the Authorization header so authenticated download endpoints work.
 */
export async function apiFetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const isFormData = options.body instanceof FormData;
  let authHeaders = await getAuthHeaders(isFormData);

  let headers: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  let response = await fetch(resolveUrl(path), { ...options, headers });

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session) {
          authHeaders = await getAuthHeaders(isFormData);
          headers = {
            ...authHeaders,
            ...(options.headers as Record<string, string>),
          };
          response = await fetch(resolveUrl(path), { ...options, headers });
        }
      } catch {
        // ignore
      } finally {
        isRefreshing = false;
      }
    }

    if (response.status === 401) {
      await handleExpiredSession();
      throw new Error("Your session has expired. Please sign in again.");
    }
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    const msg =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.error?.message === "string"
          ? body.error.message
          : `Request to ${path} failed`;
    throw new Error(msg);
  }

  return response.blob();
}

