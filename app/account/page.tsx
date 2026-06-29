import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/Badges";
import { RatingStars } from "@/components/RatingStars";
import { getCurrentProfile, getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Company, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; review?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in?next=/account");
  const profile = await getCurrentProfile();
  const sp = await searchParams;

  const supabase = await createServerSupabase();
  const [{ data: reviewData }, { data: companyData }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*, company:companies(id,slug,name)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const myReviews = (reviewData ?? []) as Review[];
  const myCompanies = (companyData ?? []) as Company[];

  return (
    <div className="container-page py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {profile?.full_name ? `Hi, ${profile.full_name}` : "Your account"}
          </h1>
          <p className="text-sm text-ink-faint">{profile?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/companies" className="btn-outline">Write a review</Link>
          <Link href="/apply" className="btn-primary">List a business</Link>
        </div>
      </header>

      {sp.applied ? (
        <p className="mb-6 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-ink-dim">
          Application submitted! We'll verify your details and email you. It's listed below
          as pending.
        </p>
      ) : null}
      {sp.review ? (
        <p className="mb-6 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-ink-dim">
          Thanks! Your review was submitted and is pending evidence verification. It
          publishes once our team confirms your proof of work.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Businesses */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Your businesses</h2>
          {myCompanies.length === 0 ? (
            <div className="panel p-6 text-sm text-ink-dim">
              <p>No listings yet.</p>
              <Link href="/apply" className="btn-primary mt-3">Apply to be listed</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myCompanies.map((company) => (
                <div key={company.id} className="panel flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{company.name}</p>
                    <p className="text-xs text-ink-faint">
                      {company.status === "approved"
                        ? `${company.rating_count} reviews · live`
                        : "Awaiting vetting"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={company.status} />
                    {company.status === "approved" ? (
                      <Link href={`/companies/${company.slug}`} className="btn-ghost">View</Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Your reviews</h2>
          {myReviews.length === 0 ? (
            <div className="panel p-6 text-sm text-ink-dim">
              <p>You haven't written any reviews yet.</p>
              <Link href="/companies" className="btn-primary mt-3">Find a pro to review</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myReviews.map((review) => (
                <div key={review.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/companies/${review.company?.slug ?? ""}`}
                        className="text-sm text-brand hover:underline"
                      >
                        {review.company?.name ?? "Company"}
                      </Link>
                      <p className="font-semibold">{review.title}</p>
                    </div>
                    <StatusBadge status={review.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
                    <RatingStars value={review.rating} size="sm" />
                    <span>· {formatDate(review.created_at)}</span>
                  </div>
                  {review.status === "pending" ? (
                    <p className="mt-2 text-xs text-ink-faint">
                      Pending evidence verification.
                    </p>
                  ) : null}
                  {review.status === "rejected" && review.admin_notes ? (
                    <p className="mt-2 text-xs text-red-300">Rejected: {review.admin_notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
