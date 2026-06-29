import { SearchIcon, MapPinIcon } from "@/components/icons";
import type { Category } from "@/lib/types";

/**
 * Native GET form — submits to /companies as query params, no client JS needed.
 */
export function SearchBar({
  categories,
  defaults,
  size = "lg",
}: {
  categories: Category[];
  defaults?: { q?: string; location?: string; category?: string };
  size?: "lg" | "sm";
}) {
  return (
    <form
      action="/companies"
      method="get"
      className={
        size === "lg"
          ? "panel-strong grid gap-3 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
          : "panel grid gap-2 p-2 sm:grid-cols-[1.4fr_1fr_auto]"
      }
    >
      <label className="relative flex items-center">
        <SearchIcon className="pointer-events-none absolute left-3 text-ink-faint" />
        <input
          type="text"
          name="q"
          defaultValue={defaults?.q}
          placeholder="What do you need done?"
          className="input pl-9"
          aria-label="Search by service or company"
        />
      </label>

      <label className="relative flex items-center">
        <MapPinIcon className="pointer-events-none absolute left-3 text-ink-faint" />
        <input
          type="text"
          name="location"
          defaultValue={defaults?.location}
          placeholder="City, state, or ZIP"
          className="input pl-9"
          aria-label="Location"
        />
      </label>

      {size === "lg" ? (
        <select
          name="category"
          defaultValue={defaults?.category ?? ""}
          className="select"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      ) : null}

      <button type="submit" className="btn-primary">
        <SearchIcon /> Search
      </button>
    </form>
  );
}
