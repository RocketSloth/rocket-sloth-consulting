import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** The authenticated Supabase auth user, or null. */
export async function getSessionUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The current user's profile row (falls back to auth metadata if the row is missing). */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string) ?? "",
    role: (user.user_metadata?.role as Role) ?? "customer",
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}
