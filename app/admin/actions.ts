"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRole } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

export async function approveApplication(formData: FormData) {
  const admin = await requireAdmin();
  if (!hasServiceRole) return;
  const applicationId = String(formData.get("application_id"));
  const companyId = String(formData.get("company_id"));
  const now = new Date().toISOString();
  const supabase = createAdminSupabase();

  await supabase
    .from("company_applications")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: now })
    .eq("id", applicationId);
  await supabase
    .from("companies")
    .update({ status: "approved", verified_at: now })
    .eq("id", companyId);

  revalidatePath("/admin");
  revalidatePath("/companies");
}

export async function rejectApplication(formData: FormData) {
  const admin = await requireAdmin();
  if (!hasServiceRole) return;
  const applicationId = String(formData.get("application_id"));
  const companyId = String(formData.get("company_id"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const now = new Date().toISOString();
  const supabase = createAdminSupabase();

  await supabase
    .from("company_applications")
    .update({ status: "rejected", admin_notes: notes, reviewed_by: admin.id, reviewed_at: now })
    .eq("id", applicationId);
  await supabase.from("companies").update({ status: "rejected" }).eq("id", companyId);

  revalidatePath("/admin");
}

export async function verifyReview(formData: FormData) {
  const admin = await requireAdmin();
  if (!hasServiceRole) return;
  const reviewId = String(formData.get("review_id"));
  const supabase = createAdminSupabase();

  await supabase
    .from("reviews")
    .update({ status: "published", verified_by: admin.id, verified_at: new Date().toISOString() })
    .eq("id", reviewId);

  revalidatePath("/admin");
}

export async function rejectReview(formData: FormData) {
  const admin = await requireAdmin();
  if (!hasServiceRole) return;
  const reviewId = String(formData.get("review_id"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const supabase = createAdminSupabase();

  await supabase
    .from("reviews")
    .update({ status: "rejected", admin_notes: notes, verified_by: admin.id, verified_at: new Date().toISOString() })
    .eq("id", reviewId);

  revalidatePath("/admin");
}
