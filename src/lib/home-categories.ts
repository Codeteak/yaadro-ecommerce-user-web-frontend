/**
 * Shared home category names + images.
 * Lives in `lib/` (not a client component) so server modules like
 * `catalog-taxonomy` can import without a Turbopack client-boundary TDZ.
 */
export const HOME_CATEGORIES = [
  { name: "Fruits", image: "/categories/fruits.jpg" },
  { name: "Vegetables", image: "/categories/vegetables.jpg" },
  { name: "Bakery", image: "/categories/bakery.jpg" },
  { name: "Dairy & Eggs", image: "/categories/dairy-eggs.jpg" },
  { name: "Beverages", image: "/categories/beverages.jpg" },
  { name: "Snacks", image: "/categories/snacks.jpg" },
] as const;

export type HomeCategory = (typeof HOME_CATEGORIES)[number]["name"];

export function homeCategoryImage(name: HomeCategory): string {
  const row = HOME_CATEGORIES.find((c) => c.name === name);
  return row?.image ?? HOME_CATEGORIES[0].image;
}
