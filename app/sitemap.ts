import type { MetadataRoute } from "next";
import { LAUNCHED, SITE_URL } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, priority: 1 },
  ];
  // Pre-launch, everything else redirects to the landing page — only list it.
  if (!LAUNCHED) return entries;

  for (const path of ["companies", "categories", "how-it-works", "for-businesses"]) {
    entries.push({ url: `${SITE_URL}/${path}`, lastModified: now, priority: 0.7 });
  }
  return entries;
}
