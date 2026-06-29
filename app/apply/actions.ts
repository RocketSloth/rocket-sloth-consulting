"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { BUCKETS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { slugify } from "@/lib/format";
import { createServerSupabase } from "@/lib/supabase/server";

export type ActionState = { error?: string };

function field(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function submitApplication(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isSupabaseConfigured) return { error: "The backend isn't configured yet." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in to apply." };

  const name = field(formData, "name");
  if (!name) return { error: "Business name is required." };

  const categorySlugs = formData.getAll("categories").map(String).filter(Boolean);
  if (categorySlugs.length === 0) return { error: "Select at least one category." };

  const licenseNumber = field(formData, "license_number");
  if (!licenseNumber) return { error: "A license number is required for vetting." };

  const supabase = await createServerSupabase();
  const phone = field(formData, "phone");
  const yearsRaw = Number(formData.get("years_in_business"));
  const years = Number.isFinite(yearsRaw) && yearsRaw > 0 ? Math.floor(yearsRaw) : null;

  // Ensure a unique slug.
  let slug = slugify(name) || "company";
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      owner_id: profile.id,
      slug,
      name,
      description: field(formData, "description"),
      phone,
      email: field(formData, "email") ?? profile.email,
      website: field(formData, "website"),
      address_line: field(formData, "address_line"),
      city: field(formData, "city"),
      state: field(formData, "state"),
      zip: field(formData, "zip"),
      service_area: field(formData, "service_area"),
      license_number: licenseNumber,
      years_in_business: years,
      status: "pending",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: companyError?.message ?? "Could not create the listing." };
  }

  // Link categories.
  const { data: cats } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);
  const links = ((cats ?? []) as Array<{ id: string }>).map((c) => ({
    company_id: company.id,
    category_id: c.id,
  }));
  if (links.length) await supabase.from("company_categories").insert(links);

  // Optional proof documents.
  const docPaths: string[] = [];
  for (const fieldName of ["license_doc", "insurance_doc"]) {
    const file = formData.get(fieldName);
    if (file instanceof File && file.size > 0) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${profile.id}/applications/${company.id}/${fieldName}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.applications)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (!uploadError) docPaths.push(`${BUCKETS.applications}/${path}`);
    }
  }

  await supabase.from("company_applications").insert({
    company_id: company.id,
    applicant_name: profile.full_name || name,
    applicant_email: profile.email,
    applicant_phone: phone,
    license_number: licenseNumber,
    doc_paths: docPaths,
    status: "pending",
  });

  redirect("/account?applied=1");
}
