import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client used only to reach the `create-payment` Edge Function.
 * The store itself remains localStorage-backed; Supabase is used for the
 * payment gateway proxy (keeps the Midtrans server key out of the browser).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const client: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

/**
 * Exported with a non-null type so the data helpers can call it directly.
 * At runtime this is still `null` when the env vars aren't configured —
 * code paths that need Supabase should check `functionsUrl()` first (the
 * storefront itself is fully localStorage-backed and never touches this).
 */
export const supabase = client as SupabaseClient;

export function functionsUrl(): string | null {
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/functions/v1`;
}