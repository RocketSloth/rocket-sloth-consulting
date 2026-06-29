import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/Badges";
import { RatingStars } from "@/components/RatingStars";
import { ReceiptIcon } from "@/components/icons";
import { getPendingApplications, getPendingReviews } from "@/lib/admin-queries";
import { getCurrentProfile } from "@/lib/auth";
import { hasServiceRole } from "@/lib/env";
import { formatCurrency, formatDate, locationLabel } from "@/lib/format";
import {
  approveApplication,
  rejectApplication,
  rejectReview,
  verifyReview,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const [applications, reviews] = await Promise.all([
    getPendingApplications(),
    getPendingReviews(),
  ]);

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold">Vetting dashboard</h1>
        <p className="mt-1 text-ink-dim">
          Approve businesses and verify the evidence behind each review before it goes live.
        </p>
      </header>

      {!hasServiceRole ? (
        <p className="panel mb-8 p-4 text-sm text-ink-dim">
          Set <code className="text-brand">SUPABASE_SERVICE_ROLE_KEY</code> to load and act
          on the vetting queues.
        </p>
      ) : null}

      {/* Applications */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl font-semibold">
          Company applications ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <p className="panel p-6 text-sm text-ink-faint">No applications waiting.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {app.company?.name ?? "Unnamed company"}
                    </h3>
                    <p className="text-sm text-ink-faint">
                      {locationLabel(app.company ?? {})}
                      {app.company?.years_in_business
                        ? ` · ${app.company.years_in_business} yrs`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {app.company?.description ? (
                  <p className="mt-3 text-sm text-ink-dim">{app.company.description}</p>
                ) : null}

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-ink-faint">Applicant:</dt>
                    <dd>{app.applicant_email || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-faint">License:</dt>
                    <dd>{app.license_number || "—"}</dd>
                  </div>
                </dl>

                {app.signedDocs.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {app.signedDocs.map((doc) => (
                      <a
                        key={doc.url}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chip"
                      >
                        📄 {doc.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-ink-faint">No documents uploaded.</p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <form action={approveApplication}>
                    <input type="hidden" name="application_id" value={app.id} />
                    <input type="hidden" name="company_id" value={app.company_id} />
                    <button type="submit" className="btn-primary">Approve &amp; publish</button>
                  </form>
                  <details className="relative">
                    <summary className="btn-outline cursor-pointer list-none">Reject</summary>
                    <form
                      action={rejectApplication}
                      className="panel-strong absolute left-0 z-10 mt-2 w-72 space-y-2 p-3"
                    >
                      <input type="hidden" name="application_id" value={app.id} />
                      <input type="hidden" name="company_id" value={app.company_id} />
                      <textarea
                        name="notes"
                        placeholder="Reason (optional)"
                        className="textarea min-h-[70px]"
                      />
                      <button type="submit" className="btn-outline w-full">Confirm reject</button>
                    </form>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">
          Reviews awaiting verification ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="panel p-6 text-sm text-ink-faint">No reviews waiting.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const receipt = (review.evidence ?? []).find((e) => e.kind === "receipt_invoice");
              const photos = (review.evidence ?? []).filter((e) => e.kind !== "receipt_invoice");
              return (
                <div key={review.id} className="panel p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/companies/${review.company?.slug ?? ""}`}
                        className="text-sm text-brand hover:underline"
                      >
                        {review.company?.name ?? "Company"}
                      </Link>
                      <h3 className="font-display text-lg font-semibold">{review.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <RatingStars value={review.rating} size="sm" />
                        <span className="text-ink-faint">by {review.author_name}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-ink-dim">{review.body}</p>

                  <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink-faint">
                    {review.job_type ? <span>{review.job_type}</span> : null}
                    {review.job_cost != null ? <span>{formatCurrency(review.job_cost)}</span> : null}
                    {review.job_completed_on ? <span>{formatDate(review.job_completed_on)}</span> : null}
                  </div>

                  {/* Evidence */}
                  <div className="mt-4 rounded-xl border border-line bg-bg/40 p-4">
                    <p className="label mb-2">Evidence</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {receipt?.url ? (
                        <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="chip">
                          <ReceiptIcon /> View receipt
                        </a>
                      ) : (
                        <span className="text-xs text-red-300">⚠ Receipt missing</span>
                      )}
                      {photos.map((photo) =>
                        photo.url ? (
                          <a
                            key={photo.id}
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-16 w-20 overflow-hidden rounded-lg border border-line"
                          >
                            <img src={photo.url} alt={photo.kind} className="h-full w-full object-cover" />
                            <span className="absolute bottom-0 left-0 right-0 bg-bg-deep/80 px-1 text-[10px] capitalize">
                              {photo.kind.replace("_photo", "")}
                            </span>
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <form action={verifyReview}>
                      <input type="hidden" name="review_id" value={review.id} />
                      <button type="submit" className="btn-primary">Verify &amp; publish</button>
                    </form>
                    <details className="relative">
                      <summary className="btn-outline cursor-pointer list-none">Reject</summary>
                      <form
                        action={rejectReview}
                        className="panel-strong absolute left-0 z-10 mt-2 w-72 space-y-2 p-3"
                      >
                        <input type="hidden" name="review_id" value={review.id} />
                        <textarea
                          name="notes"
                          placeholder="Reason (optional)"
                          className="textarea min-h-[70px]"
                        />
                        <button type="submit" className="btn-outline w-full">Confirm reject</button>
                      </form>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
