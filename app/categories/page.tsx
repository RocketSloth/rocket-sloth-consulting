import type { Metadata } from "next";
import Link from "next/link";
import { seedCategories } from "@/lib/constants";
import { getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse local home & trade service categories.",
};

export default async function CategoriesPage() {
  const db = await getCategories();
  const categories = db.length ? db : seedCategories();

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold">All categories</h1>
        <p className="mt-1 text-ink-dim">Pick a trade to see vetted pros near you.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="panel group flex items-start gap-4 p-5 transition-colors hover:border-brand/50"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-2xl">
              {category.icon}
            </span>
            <span>
              <span className="block font-display text-lg font-semibold group-hover:text-brand">
                {category.name}
              </span>
              <span className="mt-0.5 block text-sm text-ink-faint">
                {category.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
