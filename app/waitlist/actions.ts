"use server";

import { isSupabaseConfigured } from "@/lib/env";
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
    city: clean(formData.get("city"), 120) || null,
    message: clean(formData.get("message"), 1000) || null,
  };

  try {
    const supabase = await createServerSupabase();
    // ignoreDuplicates => ON CONFLICT DO NOTHING, so re-signups are a no-op success.
    const { error } = await supabase
      .from("waitlist_signups")
      .upsert(row, { onConflict: "email,kind", ignoreDuplicates: true });
    if (error) return { error: "Something went wrong. Please try again." };
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
