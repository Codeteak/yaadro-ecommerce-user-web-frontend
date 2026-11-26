/**
 * Admin home-section order (`shop_home_sections.sort_order`).
 * API returns shelves already ordered; this re-sorts defensively for UI.
 */

export type OrderedHomeShelf = {
  id: string;
  title: string;
  sortOrder: number;
};

export function sortHomeShelvesByOrder<T extends OrderedHomeShelf>(
  shelves: readonly T[],
): T[] {
  return [...shelves].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  );
}
