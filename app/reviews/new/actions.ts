"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { EVIDENCE_SPEC, REQUIRED_EVIDENCE_KINDS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function submitReview(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured) return { error: "The backend isn't configured yet." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in to leave a review." };

  const companyId = String(formData.get("company_id") ?? "");
  const rating = Number(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!companyId) return { error: "Missing company." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a star rating." };
  }
  if (!title) return { error: "Add a short headline for your review." };
  if (body.length < 20) return { error: "Tell us a bit more — at least a sentence or two." };

  // Enforce the evidence rule: receipt/invoice + before & after photos are all required.
  const files: Record<string, File> = {};
  const missing: string[] = [];
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    const file = formData.get(kind);
    if (file instanceof File && file.size > 0) files[kind] = file;
    else missing.push(EVIDENCE_SPEC[kind].label);
  }
  if (missing.length > 0) {
    return { error: `A valid review needs proof of work. Missing: ${missing.join(", ")}.` };
  }

  const supabase = await createServerSupabase();

  // Verify the company exists and is approved.
  const { data: company } = await supabase
    .from("companies")
    .select("id, status")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || (company as { status: string }).status !== "approved") {
    return { error: "That company isn't available for reviews." };
  }

  // One review per customer per company.
  const { data: dupe } = await supabase
    .from("reviews")
    .select("id")
    .eq("company_id", companyId)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (dupe) return { error: "You've already reviewed this company." };

  const costRaw = Number(formData.get("job_cost"));
  const jobCompletedOn = String(formData.get("job_completed_on") ?? "").trim();

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      company_id: companyId,
      author_id: profile.id,
      author_name: profile.full_name || "Verified customer",
      rating,
      title,
      body,
      job_type: String(formData.get("job_type") ?? "").trim() || null,
      job_cost: Number.isFinite(costRaw) && costRaw > 0 ? costRaw : null,
      job_completed_on: jobCompletedOn || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (reviewError || !review) {
    return { error: reviewError?.message ?? "Could not save your review." };
  }

  // Upload evidence and record it.
  const evidenceRows: Array<{ review_id: string; kind: string; bucket: string; path: string }> = [];
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    const file = files[kind];
    const spec = EVIDENCE_SPEC[kind];
    const ext = file.name.split(".").pop() || "bin";
    const path = `${profile.id}/reviews/${review.id}/${kind}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(spec.bucket)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      return { error: `Could not upload ${spec.label}. Please try again.` };
    }
    evidenceRows.push({ review_id: review.id, kind, bucket: spec.bucket, path });
  }
  await supabase.from("review_evidence").insert(evidenceRows);

  redirect("/account?review=pending");
}
