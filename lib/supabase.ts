import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Server-side client using the service role key. Never import this into client components. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env vars are missing (see .env.example)");
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}

export const PHOTO_BUCKET = "part-photos";
