import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyCard } from "@/components/CompanyCard";
import { SearchBar } from "@/components/SearchBar";
import { CATEGORY_SEED, seedCategories } from "@/lib/constants";
import { getCategories, getCategoryBySlug, searchCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const seed = CATEGORY_SEED.find((c) => c.slug === slug);
  const category = (await getCategoryBySlug(slug)) ?? (seed ? { name: seed.name } : null);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} pros`,
    description: `Find vetted ${category.name} companies with evidence-backed reviews.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seed = CATEGORY_SEED.find((c) => c.slug === slug);
  const category = (await getCategoryBySlug(slug)) ?? (seed
    ? { id: slug, slug, name: seed.name, description: seed.description, icon: seed.icon, sort_order: 0 }
    : null);
  if (!category) notFound();

  const [companies, dbCategories] = await Promise.all([
    searchCompanies({ category: slug }),
    getCategories(),
  ]);
  const categories = dbCategories.length ? dbCategories : seedCategories();

  return (
    <div className="container-page py-10">
      <header className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-3xl">
          {category.icon}
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold">{category.name}</h1>
          <p className="text-ink-dim">{category.description}</p>
        </div>
      </header>

      <div className="mb-8">
        <SearchBar categories={categories} defaults={{ category: slug }} size="sm" />
      </div>

      {companies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="panel p-12 text-center">
          <p className="text-lg font-semibold">No {category.name} pros listed yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-dim">
            We're still vetting businesses in this category. Run a {category.name} business?
          </p>
          <Link href="/for-businesses" className="btn-primary mt-4">
            List your business
          </Link>
        </div>
      )}
    </div>
  );
}
