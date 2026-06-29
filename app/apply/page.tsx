import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { seedCategories } from "@/lib/constants";
import { getCategories } from "@/lib/queries";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Apply to be listed" };

export default async function ApplyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in?next=/apply");

  const db = await getCategories();
  const categories = db.length ? db : seedCategories();

  return (
    <div className="container-page py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Apply to be listed</h1>
        <p className="mt-2 text-ink-dim">
          Tell us about your business. Our team reviews every application and verifies your
          license before your listing goes live with the vetted badge.
        </p>
      </header>
      <ApplyForm categories={categories} />
    </div>
  );
}
