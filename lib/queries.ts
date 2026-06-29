import { BUCKETS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Category, Company, Review } from "@/lib/types";

type AnySupabase = Awaited<ReturnType<typeof createServerSupabase>>;

/** Strip characters that would break a PostgREST `or()`/`ilike` filter. */
function safeTerm(value: string): string {
  return value.replace(/[,()%*]/g, " ").trim();
}

async function attachCategories(
  supabase: AnySupabase,
  companies: Company[]
): Promise<Company[]> {
  if (companies.length === 0) return companies;
  const ids = companies.map((c) => c.id);
  const { data } = await supabase
    .from("company_categories")
    .select("company_id, categories(*)")
    .in("company_id", ids);

  const byCompany = new Map<string, Category[]>();
  const rows = (data ?? []) as unknown as Array<{
    company_id: string;
    categories: Category | null;
  }>;
  for (const row of rows) {
    const list = byCompany.get(row.company_id) ?? [];
    if (row.categories) list.push(row.categories);
    byCompany.set(row.company_id, list);
  }
  return companies.map((c) => ({ ...c, categories: byCompany.get(c.id) ?? [] }));
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    return (data ?? []) as Category[];
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as Category) ?? null;
  } catch {
    return null;
  }
}

export interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  minRating?: number;
  sort?: "rating" | "reviews";
}

export async function searchCompanies(params: SearchParams = {}): Promise<Company[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createServerSupabase();

    let companyIds: string[] | null = null;
    if (params.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.category)
        .maybeSingle();
      if (!cat) return [];
      const { data: links } = await supabase
        .from("company_categories")
        .select("company_id")
        .eq("category_id", (cat as { id: string }).id);
      companyIds = ((links ?? []) as Array<{ company_id: string }>).map((l) => l.company_id);
      if (companyIds.length === 0) return [];
    }

    let query = supabase.from("companies").select("*").eq("status", "approved");
    if (companyIds) query = query.in("id", companyIds);

    if (params.q) {
      const q = safeTerm(params.q);
      if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (params.location) {
      const loc = safeTerm(params.location);
      if (loc) {
        query = query.or(
          `city.ilike.%${loc}%,state.ilike.%${loc}%,zip.ilike.%${loc}%,service_area.ilike.%${loc}%`
        );
      }
    }
    if (params.minRating) query = query.gte("rating_avg", params.minRating);

    const primarySort = params.sort === "reviews" ? "rating_count" : "rating_avg";
    query = query
      .order(primarySort, { ascending: false })
      .order("rating_count", { ascending: false })
      .limit(60);

    const { data } = await query;
    return attachCategories(supabase, (data ?? []) as Company[]);
  } catch {
    return [];
  }
}

export async function getTopRatedCompanies(limit = 6): Promise<Company[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("status", "approved")
      .order("rating_avg", { ascending: false })
      .order("rating_count", { ascending: false })
      .limit(limit);
    return attachCategories(supabase, (data ?? []) as Company[]);
  } catch {
    return [];
  }
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();
    if (!data) return null;
    const [withCats] = await attachCategories(supabase, [data as Company]);
    return withCats;
  } catch {
    return null;
  }
}

export async function getPublishedReviews(companyId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("reviews")
      .select("*, evidence:review_evidence(*)")
      .eq("company_id", companyId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const reviews = (data ?? []) as Review[];
    for (const review of reviews) {
      for (const item of review.evidence ?? []) {
        // Only the public photo bucket is exposed; receipts stay private.
        if (item.bucket === BUCKETS.reviewPhotos) {
          const { data: pub } = supabase.storage.from(item.bucket).getPublicUrl(item.path);
          item.url = pub.publicUrl;
        } else {
          item.url = null;
        }
      }
    }
    return reviews;
  } catch {
    return [];
  }
}

export async function getDirectoryStats(): Promise<{ companies: number; reviews: number }> {
  if (!isSupabaseConfigured) return { companies: 0, reviews: 0 };
  try {
    const supabase = await createServerSupabase();
    const [companies, reviews] = await Promise.all([
      supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
    ]);
    return { companies: companies.count ?? 0, reviews: reviews.count ?? 0 };
  } catch {
    return { companies: 0, reviews: 0 };
  }
}
