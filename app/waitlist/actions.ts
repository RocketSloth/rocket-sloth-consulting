"use server";

import { hasServiceRole, isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export type WaitlistState = { ok?: boolean; error?: string };

function clean(value: FormDataEntryValue | null, max = 500): string {
  return String(value ?? "").trim().slice(0, max);
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  const kind = clean(formData.get("kind")) === "business" ? "business" : "customer";

  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };

  const zip = clean(formData.get("zip"), 20);
  const noWebsite = Boolean(formData.get("no_website"));
  const website = noWebsite ? "" : clean(formData.get("website"), 200);

  if (kind === "customer" && !zip) {
    return { error: "Please add your ZIP code." };
  }
  // ZIP quality matters — it decides which areas open first.
  if (zip && !ZIP_RE.test(zip)) {
    return { error: "Please enter a valid 5-digit ZIP code." };
  }

  if (kind === "business") {
    // Every field is required for a business to join the waitlist.
    const missing: string[] = [];
    if (!clean(formData.get("business_name"))) missing.push("business name");
    if (!clean(formData.get("name"))) missing.push("your name");
    if (!clean(formData.get("phone"))) missing.push("phone");
    if (!clean(formData.get("city"))) missing.push("city");
    if (!zip) missing.push("ZIP code");
    if (!clean(formData.get("category"))) missing.push("type of business");
    if (!website && !noWebsite) {
      missing.push('website (or check "I don\'t have a website yet")');
    }
    if (missing.length > 0) {
      return { error: `Please fill in: ${missing.join(", ")}.` };
    }
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
    website: website || null,
    city: clean(formData.get("city"), 120) || null,
    zip: zip || null,
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

/** Referral loop: a resident recommends a business their neighbors trust. */
export async function recommendBusiness(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const businessName = clean(formData.get("business_name"), 160);
  const category = clean(formData.get("category"), 60);
  const city = clean(formData.get("city"), 120);

  const missing: string[] = [];
  if (!businessName) missing.push("business name");
  if (!category) missing.push("category");
  if (!city) missing.push("city");
  if (missing.length > 0) return { error: `Please fill in: ${missing.join(", ")}.` };

  if (!isSupabaseConfigured) {
    return { error: "We can't save that right now — please try again shortly." };
  }

  const recommenderEmail = clean(formData.get("recommender_email"), 200).toLowerCase();
  const row = {
    recommender_email: EMAIL_RE.test(recommenderEmail) ? recommenderEmail : null,
    business_name: businessName,
    category,
    city,
    reason: clean(formData.get("reason"), 1000) || null,
    contact_info: clean(formData.get("contact_info"), 300) || null,
  };

  try {
    const supabase = hasServiceRole ? createAdminSupabase() : await createServerSupabase();
    const { error } = await supabase.from("business_recommendations").insert(row);
    if (error) {
      console.error("Recommendation failed:", error.message ?? error);
      return { error: "Something went wrong. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Recommendation exception:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
