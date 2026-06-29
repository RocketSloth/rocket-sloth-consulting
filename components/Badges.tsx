import Link from "next/link";
import { ShieldCheckIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import type { Category } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-mountain/15 text-mountain",
  under_review: "bg-mountain/15 text-mountain",
  approved: "bg-brand/20 text-brand",
  published: "bg-brand/20 text-brand",
  rejected: "bg-red-500/15 text-red-300",
  suspended: "bg-red-500/15 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  under_review: "Under review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", STATUS_STYLES[status] ?? "bg-panel text-ink-dim")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("badge bg-brand/15 text-brand", className)}>
      <ShieldCheckIcon /> Vetted
    </span>
  );
}

export function CategoryPill({
  category,
  asLink = true,
}: {
  category: Category;
  asLink?: boolean;
}) {
  const content = (
    <>
      {category.icon ? <span aria-hidden>{category.icon}</span> : null}
      {category.name}
    </>
  );
  if (!asLink) return <span className="chip">{content}</span>;
  return (
    <Link href={`/categories/${category.slug}`} className="chip">
      {content}
    </Link>
  );
}
