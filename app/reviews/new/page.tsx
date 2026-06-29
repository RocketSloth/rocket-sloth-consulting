import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/queries";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Write a review" };

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company: slug } = await searchParams;
  const target = `/reviews/new${slug ? `?company=${slug}` : ""}`;

  const user = await getSessionUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(target)}`);

  const company = slug ? await getCompanyBySlug(slug) : null;

  if (!company) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Pick a company to review</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-dim">
          Find the business you hired, then use the “Write a review” button on its profile.
        </p>
        <Link href="/companies" className="btn-primary mt-6">
          Browse companies
        </Link>
      </div>
    );
  }

  if (company.owner_id === user.id) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">You can't review your own business</h1>
        <Link href={`/companies/${company.slug}`} className="btn-primary mt-6">
          Back to {company.name}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm text-ink-faint">
          <Link href={`/companies/${company.slug}`} className="hover:text-ink">
            ← {company.name}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">Review {company.name}</h1>
        <p className="mt-2 text-ink-dim">
          Honest, evidence-backed reviews help your neighbors hire with confidence.
        </p>
      </header>
      <ReviewForm companyId={company.id} companyName={company.name} />
    </div>
  );
}
