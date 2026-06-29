import Link from "next/link";
import { CategoryPill, VerifiedBadge } from "@/components/Badges";
import { RatingStars } from "@/components/RatingStars";
import { MapPinIcon } from "@/components/icons";
import { formatRating, locationLabel } from "@/lib/format";
import type { Company } from "@/lib/types";

export function CompanyCard({ company }: { company: Company }) {
  const location = locationLabel(company);
  const primary = company.categories?.[0];

  return (
    <Link
      href={`/companies/${company.slug}`}
      className="panel group flex flex-col overflow-hidden transition-all hover:border-brand/50 hover:shadow-panel"
    >
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-brand-deep/60 via-bg to-bg-deep">
        {company.cover_url ? (
          <img
            src={company.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-70">
            {primary?.icon ?? "🏠"}
          </span>
        )}
        <span className="absolute right-3 top-3">
          <VerifiedBadge />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink group-hover:text-brand">
            {company.name}
          </h3>
          {location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
              <MapPinIcon /> {location}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <RatingStars value={company.rating_avg} size="sm" />
          <span className="text-sm font-semibold text-ink">{formatRating(company.rating_avg)}</span>
          <span className="text-xs text-ink-faint">
            ({company.rating_count} {company.rating_count === 1 ? "review" : "reviews"})
          </span>
        </div>

        {company.description ? (
          <p className="line-clamp-2 text-sm text-ink-dim">{company.description}</p>
        ) : null}

        {company.categories && company.categories.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {company.categories.slice(0, 2).map((category) => (
              <CategoryPill key={category.id} category={category} asLink={false} />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
