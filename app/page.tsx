import Link from "next/link";
import { VerifiedBadge } from "@/components/Badges";
import { CompanyCard } from "@/components/CompanyCard";
import { SearchBar } from "@/components/SearchBar";
import {
  ArrowRightIcon,
  CameraIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { seedCategories } from "@/lib/constants";
import { getCategories, getDirectoryStats, getTopRatedCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dbCategories, topRated, stats] = await Promise.all([
    getCategories(),
    getTopRatedCompanies(8),
    getDirectoryStats(),
  ]);
  const categories = dbCategories.length ? dbCategories : seedCategories();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        </div>
        <div className="container-page py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge mx-auto mb-5 border border-line-strong bg-panel text-ink-dim">
              <ShieldCheckIcon className="text-brand" /> Vetted pros · evidence-backed reviews
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Find local pros your <span className="text-brand">neighbors</span> actually
              trust.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-dim">
              Every company is screened before it's listed. Every review is backed by a
              real receipt and before & after photos. No fake five-stars — just proof.
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-4xl">
            <SearchBar categories={categories} size="lg" />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-faint">
              <span>Popular:</span>
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="chip"
                >
                  {category.icon} {category.name}
                </Link>
              ))}
            </div>
          </div>

          {stats.companies > 0 || stats.reviews > 0 ? (
            <div className="mx-auto mt-10 flex max-w-md justify-center gap-10 text-center">
              <div>
                <p className="font-display text-3xl font-bold text-ink">{stats.companies}</p>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Vetted pros</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-ink">{stats.reviews}</p>
                <p className="text-xs uppercase tracking-wide text-ink-faint">
                  Verified reviews
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Browse by category</h2>
          <Link href="/categories" className="link-muted text-sm">
            All categories →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="panel group flex items-center gap-3 p-4 transition-colors hover:border-brand/50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-2xl">
                {category.icon}
              </span>
              <span>
                <span className="block font-semibold text-ink group-hover:text-brand">
                  {category.name}
                </span>
                <span className="block text-xs text-ink-faint">{category.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Top rated */}
      {topRated.length > 0 ? (
        <section className="container-page py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">Top-rated near the Northwest</h2>
            <Link href="/companies" className="link-muted text-sm">
              Browse all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topRated.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="container-page py-16">
        <h2 className="text-center font-display text-3xl font-bold">How it works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ink-dim">
          The trust comes from two simple rules we never bend.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <SearchIcon className="text-2xl text-brand" />,
              title: "1. Search vetted pros",
              body: "Browse companies that passed our screening — license, contact, and category all checked before they go live.",
            },
            {
              icon: <ShieldCheckIcon className="text-2xl text-brand" />,
              title: "2. Hire with confidence",
              body: "Compare ratings built only from reviews we verified. The vetted badge means we did the homework.",
            },
            {
              icon: <ReceiptIcon className="text-2xl text-brand" />,
              title: "3. Review with proof",
              body: "After the job, leave a review — but only with a receipt plus before & after photos. Proof keeps it honest.",
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

      {/* Evidence band */}
      <section className="container-page py-12">
        <div className="panel-strong overflow-hidden">
          <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
            <div>
              <VerifiedBadge />
              <h2 className="mt-4 font-display text-3xl font-bold">
                Reviews you can actually believe.
              </h2>
              <p className="mt-3 text-ink-dim">
                Anyone can post five stars on other sites. Here, a review isn't valid
                until the reviewer uploads a receipt or invoice and before &amp; after
                photos of the work. Our team verifies the proof before it ever publishes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/how-it-works#evidence" className="btn-outline">
                  Our evidence policy
                </Link>
                <Link href="/companies" className="btn-primary">
                  Browse pros <ArrowRightIcon />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="panel flex flex-col items-center gap-2 p-6 text-center">
                <ReceiptIcon className="text-3xl text-brand" />
                <p className="font-semibold">Receipt / invoice</p>
                <p className="text-xs text-ink-faint">Proves the job really happened.</p>
              </div>
              <div className="panel flex flex-col items-center gap-2 p-6 text-center">
                <CameraIcon className="text-3xl text-brand" />
                <p className="font-semibold">Before &amp; after</p>
                <p className="text-xs text-ink-faint">Shows the work that was done.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For businesses CTA */}
      <section className="container-page pb-20">
        <div className="panel flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="font-display text-2xl font-bold">Own a home-service business?</h2>
          <p className="max-w-xl text-ink-dim">
            Get in front of homeowners who are ready to hire. Apply to be listed and earn
            the vetted badge that sets you apart.
          </p>
          <Link href="/for-businesses" className="btn-primary">
            List your business <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}
