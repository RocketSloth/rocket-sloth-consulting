"use server";

import { hasServiceRole, isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export type WaitlistState = { ok?: boolean; error?: string };

function clean(value: FormDataEntryValue | null, max = 500): string {
  return String(value ?? "").trim().slice(0, max);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  const kind = clean(formData.get("kind")) === "business" ? "business" : "customer";

  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (kind === "business" && !clean(formData.get("business_name"))) {
    return { error: "Please add your business name." };
  }
  if (!isSupabaseConfigured) {
    return { error: "We can't save that right now — please try again shortly." };
  }

  const row = {
    email,
    kind,
    name: clean(formData.get("name"), 120) || null,
    business_name: clean(formData.get("business_name"), 160) || null,
    category: clean(formData.get("category"), 60) || null,
    website: clean(formData.get("website"), 200) || null,
    city: clean(formData.get("city"), 120) || null,
    zip: clean(formData.get("zip"), 20) || null,
    phone: clean(formData.get("phone"), 40) || null,
    message: clean(formData.get("message"), 1000) || null,
  };

  try {
    // Write server-side with the service-role client so the insert isn't blocked
    // by the admin-only SELECT policy when PostgREST returns the row. (This is a
    // Server Action — the key never reaches the browser.) Falls back to the anon
    // client only if no service-role key is configured.
    const supabase = hasServiceRole ? createAdminSupabase() : await createServerSupabase();
    const { error } = await supabase.from("waitlist_signups").insert(row);
    // 23505 = unique violation (already on the list) — treat as success.
    if (error && error.code !== "23505") {
      console.error("Waitlist signup failed:", error.message ?? error);
      return { error: "Something went wrong. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Waitlist signup exception:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
