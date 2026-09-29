// src/lib/supabase.ts
// Supabase client — uses only the public anon key (safe for client-side).
// The service role key NEVER appears here; it lives only in server/.env

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE is the recommended flow for SPAs — more secure than implicit flow
    // and works correctly after OAuth redirects in production.
    flowType: "pkce",
    // Auto-detect the session from the URL hash/query params on OAuth callback.
    detectSessionInUrl: true,
    // Persist the session in localStorage so it survives page refreshes.
    persistSession: true,
  },
});
