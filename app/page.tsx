import Link from "next/link";
import { CompanyCard } from "@/components/CompanyCard";
import { CustomerSignupForm, BusinessSignupForm } from "@/components/WaitlistForms";
import {
  CheckIcon,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@/components/icons";
import { getLaunchProgress } from "@/lib/admin-queries";
import { LAUNCH_AREA, LAUNCH_CATEGORIES } from "@/lib/constants";
import { LAUNCHED } from "@/lib/env";
import { getTopRatedCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Hide the ticker until there's a number worth showing. */
const TICKER_MIN_RESIDENTS = 5;

export default async function HomePage() {
  const [preview, progress] = await Promise.all([
    getTopRatedCompanies(4),
    getLaunchProgress(),
  ]);

  return (
    <div>
      {/* Hero — customer email capture */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        </div>
        <div className="container-page py-16 text-center sm:py-24">
          <span className="badge mx-auto mb-5 border border-line-strong bg-panel text-ink-dim">
            <MapPinIcon className="text-brand" /> Now building: {LAUNCH_AREA}
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Help us build the list of local pros your{" "}
            <span className="text-brand">neighbors</span> actually trust.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-dim">
            Tired of asking the neighborhood group for a good roofer, plumber, or lawn
            guy? VettedPages is one local list — every business screened before it's
            listed, every review verified. Your ZIP and most-needed service tell us
            where to open first.
          </p>

          <div className="mt-9">
            <CustomerSignupForm />
          </div>

          {progress.residents >= TICKER_MIN_RESIDENTS ? (
            <p className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-ink-dim">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              <strong className="text-ink">{progress.residents}</strong> neighbors have
              joined
              {progress.topService ? (
                <>
                  <span aria-hidden>·</span> top requested:{" "}
                  <strong className="text-brand">{progress.topService}</strong>
                </>
              ) : null}
              {progress.businesses > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <strong className="text-ink">{progress.businesses}</strong>{" "}
                  {progress.businesses === 1 ? "business" : "businesses"} applied
                </>
              ) : null}
            </p>
          ) : null}

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
              Own a local business? Become a founding vetted business.
            </h2>
            <p className="mt-3 text-ink-dim">
              We're accepting a limited number of founding businesses per category per
              area. Tell us about your business and we'll reach out as we open up
              vetting — launch categories in {LAUNCH_AREA} go first.
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
            <BusinessSignupForm />
          </div>
        </div>
      </section>

      {/* Launch categories */}
      <section className="container-page py-12">
        <h2 className="text-center font-display text-2xl font-bold">
          Launch categories
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ink-dim">
          We're opening with the services neighbors ask about most in {LAUNCH_AREA} —
          then expanding as each category fills.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LAUNCH_CATEGORIES.map((category) => (
            <div key={category.slug} className="panel flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-2xl">
                {category.icon}
              </span>
              <span className="font-semibold text-ink">{category.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          Every kind of local business can still request early access below — launch
          categories just go live first.
        </p>
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
          <h2 className="font-display text-2xl font-bold">
            Help build the vetted list for your neighborhood.
          </h2>
          <p className="max-w-xl text-ink-dim">
            Join the list, tell us what you need, and we'll let you know the moment
            vetted pros go live near you.
          </p>
          <CustomerSignupForm />
        </div>
      </section>
    </div>
  );
}
