import type { Metadata } from "next";
import Link from "next/link";
import { CompanyCard } from "@/components/CompanyCard";
import { SearchIcon } from "@/components/icons";
import { seedCategories } from "@/lib/constants";
import { getCategories, searchCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse vetted pros",
  description: "Search screened local home & trade companies with verified reviews.",
};

type SP = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const location = one(sp.location);
  const category = one(sp.category);
  const sort = one(sp.sort) === "reviews" ? "reviews" : "rating";
  const minRating = Number(one(sp.minRating)) || 0;

  const [dbCategories, companies] = await Promise.all([
    getCategories(),
    searchCompanies({ q, location, category, sort, minRating }),
  ]);
  const categories = dbCategories.length ? dbCategories : seedCategories();
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">
          {activeCategory ? `${activeCategory.name} pros` : "Browse vetted pros"}
        </h1>
        <p className="mt-1 text-ink-dim">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
          {activeCategory ? ` in ${activeCategory.name}` : ""}
          {location ? ` near “${location}”` : ""}
        </p>
      </header>

      {/* Filters — native GET form */}
      <form
        action="/companies"
        method="get"
        className="panel mb-8 grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto]"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Service or company"
          className="input"
          aria-label="Search"
        />
        <input
          type="text"
          name="location"
          defaultValue={location}
          placeholder="City, state, ZIP"
          className="input"
          aria-label="Location"
        />
        <select name="category" defaultValue={category} className="select" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="minRating" defaultValue={String(minRating)} className="select" aria-label="Minimum rating">
          <option value="0">Any rating</option>
          <option value="3">3.0+</option>
          <option value="4">4.0+</option>
          <option value="4.5">4.5+</option>
        </select>
        <select name="sort" defaultValue={sort} className="select" aria-label="Sort">
          <option value="rating">Top rated</option>
          <option value="reviews">Most reviewed</option>
        </select>
        <button type="submit" className="btn-primary">
          <SearchIcon /> Filter
        </button>
      </form>

      {companies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-lg font-semibold">No pros match yet.</p>
          <p className="max-w-md text-sm text-ink-dim">
            Try widening your filters. If the directory is brand new, listings appear here
            as businesses are vetted and approved.
          </p>
          <div className="flex gap-3">
            <Link href="/companies" className="btn-outline">
              Clear filters
            </Link>
            <Link href="/for-businesses" className="btn-primary">
              List your business
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
