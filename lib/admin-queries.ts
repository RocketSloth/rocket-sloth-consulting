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

export interface WaitlistRow {
  id: string;
  email: string;
  kind: "customer" | "business";
  name: string | null;
  business_name: string | null;
  category: string | null;
  website: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
}

export interface TopCount {
  label: string;
  count: number;
}

export interface RecommendationRow {
  id: string;
  recommender_email: string | null;
  business_name: string;
  category: string | null;
  city: string | null;
  reason: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
}

function topCounts(values: Array<string | null>, limit = 8): TopCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = (value ?? "").trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getWaitlist(): Promise<{
  customers: number;
  businesses: number;
  recent: WaitlistRow[];
  topServices: TopCount[];
  topZips: TopCount[];
}> {
  if (!hasServiceRole) {
    return { customers: 0, businesses: 0, recent: [], topServices: [], topZips: [] };
  }
  const supabase = createAdminSupabase();
  const [customers, businesses, recent, demand] = await Promise.all([
    supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true })
      .eq("kind", "customer"),
    supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true })
      .eq("kind", "business"),
    supabase
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("waitlist_signups")
      .select("category, zip")
      .eq("kind", "customer")
      .limit(2000),
  ]);
  const demandRows = (demand.data ?? []) as Array<{ category: string | null; zip: string | null }>;
  return {
    customers: customers.count ?? 0,
    businesses: businesses.count ?? 0,
    recent: (recent.data ?? []) as WaitlistRow[],
    topServices: topCounts(demandRows.map((r) => r.category)),
    topZips: topCounts(demandRows.map((r) => r.zip)),
  };
}

export async function getRecommendations(): Promise<{
  total: number;
  recent: RecommendationRow[];
}> {
  if (!hasServiceRole) return { total: 0, recent: [] };
  const supabase = createAdminSupabase();
  const { data, count } = await supabase
    .from("business_recommendations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50);
  return { total: count ?? 0, recent: (data ?? []) as RecommendationRow[] };
}
