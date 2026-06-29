import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryPill, VerifiedBadge } from "@/components/Badges";
import { RatingStars } from "@/components/RatingStars";
import {
  CameraIcon,
  CheckIcon,
  MapPinIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { formatCurrency, formatDate, formatRating, locationLabel } from "@/lib/format";
import { getCompanyBySlug, getPublishedReviews } from "@/lib/queries";
import type { Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.name} — reviews & ratings`,
    description:
      company.description ??
      `Vetted ${company.name} on RocketSloth.Space with evidence-backed reviews.`,
  };
}

function ReviewCard({ review }: { review: Review }) {
  const photos = (review.evidence ?? []).filter(
    (e) => e.bucket === "review-photos" && e.url
  );
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RatingStars value={review.rating} size="sm" />
            <span className="text-sm font-semibold">{review.rating.toFixed(1)}</span>
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold">{review.title}</h3>
        </div>
        <span className="badge bg-brand/15 text-brand whitespace-nowrap">
          <ShieldCheckIcon /> Verified
        </span>
      </div>

      <p className="mt-2 text-sm text-ink-dim">{review.body}</p>

      {photos.length > 0 ? (
        <div className="mt-4 flex gap-2">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-20 w-24 overflow-hidden rounded-lg border border-line"
            >
              <img src={photo.url ?? ""} alt={photo.kind} className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-bg-deep/80 px-1 py-0.5 text-[10px] capitalize text-ink-dim">
                {photo.kind.replace("_photo", "")}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
        <span className="font-medium text-ink-dim">{review.author_name || "Verified customer"}</span>
        {review.job_type ? <span>· {review.job_type}</span> : null}
        {review.job_cost != null ? <span>· {formatCurrency(review.job_cost)}</span> : null}
        {review.job_completed_on ? <span>· {formatDate(review.job_completed_on)}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip">
          <ReceiptIcon /> Receipt on file
        </span>
        <span className="chip">
          <CameraIcon /> Before &amp; after
        </span>
      </div>
    </article>
  );
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const reviews = await getPublishedReviews(company.id);
  const location = locationLabel(company);

  return (
    <div className="container-page py-8">
      {/* Banner */}
      <div className="panel-strong overflow-hidden">
        <div className="relative h-36 bg-gradient-to-br from-brand-deep/60 via-bg to-bg-deep sm:h-48">
          {company.cover_url ? (
            <img src={company.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-60">
              {company.categories?.[0]?.icon ?? "🏠"}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{company.name}</h1>
              <VerifiedBadge />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-dim">
              <span className="flex items-center gap-1.5">
                <RatingStars value={company.rating_avg} size="sm" />
                <strong className="text-ink">{formatRating(company.rating_avg)}</strong>
                <span className="text-ink-faint">
                  ({company.rating_count} {company.rating_count === 1 ? "review" : "reviews"})
                </span>
              </span>
              {location ? (
                <span className="flex items-center gap-1 text-ink-faint">
                  <MapPinIcon /> {location}
                </span>
              ) : null}
            </div>
            {company.categories && company.categories.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {company.categories.map((c) => (
                  <CategoryPill key={c.id} category={c} />
                ))}
              </div>
            ) : null}
          </div>
          <Link href={`/reviews/new?company=${company.slug}`} className="btn-primary shrink-0">
            Write a review
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main */}
        <div className="space-y-6">
          {company.description ? (
            <section className="panel p-6">
              <h2 className="font-display text-xl font-semibold">About</h2>
              <p className="mt-2 text-ink-dim">{company.description}</p>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                Verified reviews ({reviews.length})
              </h2>
              <Link href={`/reviews/new?company=${company.slug}`} className="link-muted text-sm">
                Add yours →
              </Link>
            </div>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="panel p-8 text-center text-ink-dim">
                <p className="font-semibold text-ink">No reviews yet.</p>
                <p className="mt-1 text-sm">
                  Hired {company.name}? Be the first to leave a verified review.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="panel p-6">
            <h2 className="font-display text-lg font-semibold">Contact</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {company.phone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Phone</dt>
                  <dd className="text-ink">{company.phone}</dd>
                </div>
              ) : null}
              {company.website ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Website</dt>
                  <dd>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Visit site
                    </a>
                  </dd>
                </div>
              ) : null}
              {company.service_area ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">Service area</dt>
                  <dd className="text-right text-ink">{company.service_area}</dd>
                </div>
              ) : null}
              {company.years_in_business ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-faint">In business</dt>
                  <dd className="text-ink">{company.years_in_business} years</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="panel p-6">
            <h2 className="font-display text-lg font-semibold">Why you can trust this</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-dim">
              <li className="flex gap-2">
                <CheckIcon className="mt-0.5 shrink-0 text-brand" /> Screened &amp; vetted before listing
              </li>
              {company.license_number ? (
                <li className="flex gap-2">
                  <CheckIcon className="mt-0.5 shrink-0 text-brand" /> License on file (
                  {company.license_number})
                </li>
              ) : null}
              <li className="flex gap-2">
                <CheckIcon className="mt-0.5 shrink-0 text-brand" /> Reviews require receipt + before/after
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
