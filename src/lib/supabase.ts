import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Single shared Supabase client, or null if env vars aren't configured.
 *  The Notes panel checks for null and falls back to localStorage. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 4 } } }) : null;

export const SUPABASE_READY = supabase !== null;
