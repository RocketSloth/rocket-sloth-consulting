import "server-only";
import { hasServiceRole } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { CompanyApplication, Review } from "@/lib/types";

export interface AdminApplication extends CompanyApplication {
  signedDocs: { name: string; url: string }[];
}

function splitPath(stored: string): { bucket: string; path: string } {
  const idx = stored.indexOf("/");
  return { bucket: stored.slice(0, idx), path: stored.slice(idx + 1) };
}

export async function getPendingApplications(): Promise<AdminApplication[]> {
  if (!hasServiceRole) return [];
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("company_applications")
    .select("*, company:companies(*)")
    .in("status", ["pending", "under_review"])
    .order("created_at", { ascending: true });

  const apps = (data ?? []) as AdminApplication[];
  for (const app of apps) {
    const docs: { name: string; url: string }[] = [];
    for (const stored of app.doc_paths ?? []) {
      const { bucket, path } = splitPath(stored);
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (signed?.signedUrl) {
        docs.push({ name: path.split("/").pop() ?? "document", url: signed.signedUrl });
      }
    }
    app.signedDocs = docs;
  }
  return apps;
}

export async function getPendingReviews(): Promise<Review[]> {
  if (!hasServiceRole) return [];
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("reviews")
    .select("*, company:companies(id,slug,name), evidence:review_evidence(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const reviews = (data ?? []) as Review[];
  for (const review of reviews) {
    for (const item of review.evidence ?? []) {
      if (item.bucket === "review-photos") {
        const { data: pub } = supabase.storage.from(item.bucket).getPublicUrl(item.path);
        item.url = pub.publicUrl;
      } else {
        const { data: signed } = await supabase.storage
          .from(item.bucket)
          .createSignedUrl(item.path, 3600);
        item.url = signed?.signedUrl ?? null;
      }
    }
  }
  return reviews;
}

export async function getAdminCounts(): Promise<{ apps: number; reviews: number }> {
  if (!hasServiceRole) return { apps: 0, reviews: 0 };
  const supabase = createAdminSupabase();
  const [apps, reviews] = await Promise.all([
    supabase
      .from("company_applications")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "under_review"]),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return { apps: apps.count ?? 0, reviews: reviews.count ?? 0 };
}
