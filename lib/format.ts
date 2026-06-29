/** Tiny classnames joiner (avoids a clsx dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatRating(value: number | null | undefined): string {
  if (!value) return "New";
  return value.toFixed(1);
}

export function formatCurrency(value: number | null | undefined): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function locationLabel(parts: {
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const { city, state, zip } = parts;
  const left = [city, state].filter(Boolean).join(", ");
  return [left, zip].filter(Boolean).join(" ").trim();
}
