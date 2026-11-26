/**
 * Admin home-section order (`shop_home_sections.sort_order`).
 * API returns shelves already ordered; this re-sorts defensively for UI.
 *
 * Canonical home body (live + playground `home-section-sort`):
 * 1. Category pill rail
 * 2. ProductSection (All / selected aisle — driven by the pills)
 * 3. Admin sections in sort_order (Daily Dairy art / Festive / product shelves)
 * 4. Fruits & veggies
 * 5. Category product rails (Eggs, Dairy aisles, …) — always last before favourites
 * 6. Favourites + footer
 *
 * Empty / disabled sections never appear (API already filters is_enabled + products).
 */

export type OrderedHomeShelf = {
  id: string;
  title: string;
  sortOrder: number;
};

/**
 * `canonical` — pills → All → admin sort → produce → category rails.
 * `legacy-buried` — old layout (admin after all catalog chrome); playground compare only.
 */
export type HomeBodyLayout = "canonical" | "legacy-buried";

export const HOME_BODY_LAYOUT: HomeBodyLayout = "canonical";

export function sortHomeShelvesByOrder<T extends OrderedHomeShelf>(
  shelves: readonly T[],
): T[] {
  return [...shelves].sort((a, b) => {
    const ao = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bo = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.POSITIVE_INFINITY;
    return ao - bo || a.title.localeCompare(b.title);
  });
}
