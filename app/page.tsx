import Link from "next/link";
import { CompanyCard } from "@/components/CompanyCard";
import { CustomerSignupForm, BusinessSignupForm } from "@/components/WaitlistForms";
import {
  CheckIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@/components/icons";
import { seedCategories } from "@/lib/constants";
import { LAUNCHED } from "@/lib/env";
import { getCategories, getTopRatedCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dbCategories, preview] = await Promise.all([
    getCategories(),
    getTopRatedCompanies(4),
  ]);
  const categories = dbCategories.length ? dbCategories : seedCategories();

  return (
    <div>
      {/* Hero — customer email capture */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        </div>
        <div className="container-page py-16 text-center sm:py-24">
          <span className="badge mx-auto mb-5 border border-line-strong bg-panel text-ink-dim">
            <ShieldCheckIcon className="text-brand" /> Launching soon · join the list
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Local pros your <span className="text-brand">neighbors</span> actually trust —
            coming soon.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-dim">
            We're building a vetted directory of local home &amp; trade companies, where
            every business is screened before it's listed and reviews are verified — so
            you can hire with confidence. Be first in line.
          </p>

          <div className="mt-9">
            <CustomerSignupForm />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-brand" /> Vetted businesses only</span>
            <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-brand" /> Verified reviews</span>
            <span className="inline-flex items-center gap-1.5"><CheckIcon className="text-brand" /> Built for your area</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-12">
        <h2 className="text-center font-display text-3xl font-bold">What we're building</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ink-dim">
          A recommendations site you can actually trust.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <SearchIcon className="text-2xl text-brand" />,
              title: "Find vetted pros",
              body: "Every company is screened — license, contact, and category checked — before it's ever listed.",
            },
            {
              icon: <ShieldCheckIcon className="text-2xl text-brand" />,
              title: "Hire with confidence",
              body: "Ratings are built only from reviews we verified. The vetted badge means we did the homework.",
            },
            {
              icon: <StarIcon className="text-2xl text-brand" />,
              title: "Verified reviews",
              body: "Reviews are checked before they count, so ratings reflect real experiences — not fakes.",
            },
          ].map((step) => (
            <div key={step.title} className="panel p-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand/10">
                {step.icon}
              </div>
              <h3 className="font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-dim">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For businesses — early access */}
      <section id="early-access" className="container-page scroll-mt-20 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="badge border border-line-strong bg-panel text-ink-dim">
              For business owners
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold">
              Own a home-service business? Get in early.
            </h2>
            <p className="mt-3 text-ink-dim">
              Be one of the first vetted pros homeowners see when we launch in your area.
              Tell us about your business and we'll reach out as we open up vetting.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-dim">
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> Founding-member placement in the directory</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> The vetted badge that sets you apart</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> Verified reviews you can trust, not fakes</li>
            </ul>
            {LAUNCHED ? (
              <p className="mt-5 text-sm text-ink-faint">
                Ready to complete a full application?{" "}
                <Link href="/apply" className="text-brand hover:underline">
                  Apply to be listed →
                </Link>
              </p>
            ) : null}
          </div>
          <div className="panel-strong p-6 sm:p-8">
            <h3 className="mb-4 font-display text-lg font-semibold">Request early access</h3>
            <BusinessSignupForm categories={categories} />
          </div>
        </div>
      </section>

      {/* Categories preview */}
      <section className="container-page py-12">
        <h2 className="mb-6 text-center font-display text-2xl font-bold">
          Trades we're starting with
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <div key={category.id} className="panel flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-2xl">
                {category.icon}
              </span>
              <span className="font-semibold text-ink">{category.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Directory preview (only once launched — profiles are locked pre-launch) */}
      {LAUNCHED && preview.length > 0 ? (
        <section className="container-page py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">An early peek</h2>
              <p className="text-sm text-ink-faint">A preview of vetted pros joining the directory.</p>
            </div>
            <Link href="/companies" className="link-muted text-sm">
              Browse the preview →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {preview.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Final CTA */}
      <section className="container-page pb-20 pt-4">
        <div className="panel flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="font-display text-2xl font-bold">Want updates as we build?</h2>
          <p className="max-w-xl text-ink-dim">
            Join the list and we'll let you know the moment vetted pros go live near you.
          </p>
          <CustomerSignupForm />
        </div>
      </section>
    </div>
  );
}
