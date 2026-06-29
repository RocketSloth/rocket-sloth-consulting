import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Privileged service-role client. Bypasses RLS — use ONLY in trusted server code
 * (admin vetting, rating rollups, signed-URL generation). Never import in the browser.
 */
export function createAdminSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
