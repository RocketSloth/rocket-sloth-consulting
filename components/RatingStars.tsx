import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/format";

export function RatingStars({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;
  const sizeClass = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span
      className={cn("relative inline-flex leading-none", sizeClass, className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <span className="flex text-line-strong">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} filled />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-salmon"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} filled />
        ))}
      </span>
    </span>
  );
}
