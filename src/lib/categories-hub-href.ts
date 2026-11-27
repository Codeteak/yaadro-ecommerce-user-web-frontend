/**
 * Home “Show all” / aisle Browse all → Categories hub (not PLP).
 * Produce band uses `producePlpHref` instead (fruits∪veg PLP).
 * Optional `cat` opens that aisle in the hub rail.
 */
export function categoriesHubHref(slug?: string | null): string {
  const trimmed = slug?.trim();
  if (!trimmed || trimmed === "all") return "/categories";
  return `/categories?cat=${encodeURIComponent(trimmed)}`;
}
