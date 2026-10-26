import {
  homeCategoryImage,
  type HomeCategory,
} from "@/lib/home-categories";

/**
 * Sample category taxonomy for hub + PLP UI.
 * Replace with catalog API sections / subcategories when available.
 */

export type CatalogTileShape = "square" | "rect";

export type CatalogCategory = {
  slug: string;
  name: string;
  /** Short label under the tile when different from name. */
  shortName?: string;
  /** Maps to sample product `category` when set. */
  homeCategory?: HomeCategory;
  image: string;
  /** Left-rail chips on the listing page. */
  subcategories: { name: string; image: string }[];
  /** Hub tile aspect — overridden by section layout for lead tiles. */
  tile?: CatalogTileShape;
};

export type CatalogSectionLayout =
  /** First tile wide rectangle, rest squares. */
  | "rect-first"
  /** First square, second wide rectangle, rest squares. */
  | "square-then-rect"
  | "uniform";

export type CatalogSection = {
  id: string;
  title: string;
  subtitle?: string;
  layout: CatalogSectionLayout;
  categories: CatalogCategory[];
};

function homeImage(name: HomeCategory): string {
  return homeCategoryImage(name);
}

function subs(
  entries: { name: string; image: string }[],
): { name: string; image: string }[] {
  return [
    { name: "All", image: entries[0]?.image ?? homeImage("Fruits") },
    ...entries,
  ];
}

function cat(
  partial: Omit<CatalogCategory, "subcategories"> & {
    subcategories?: { name: string; image: string }[];
  },
): CatalogCategory {
  const image = partial.image;
  return {
    ...partial,
    subcategories:
      partial.subcategories ??
      subs([
        { name: "Popular", image },
        { name: "Offers", image },
      ]),
  };
}

export const CATALOG_SECTIONS: CatalogSection[] = [
  {
    id: "fresh",
    title: "Fresh",
    subtitle: "Farm-picked produce & daily essentials",
    layout: "rect-first",
    categories: [
      cat({
        slug: "vegetables",
        name: "Fresh Vegetables",
        shortName: "Vegetables",
        homeCategory: "Vegetables",
        image: homeImage("Vegetables"),
        subcategories: subs([
          { name: "Leafy greens", image: "/products/herbs.jpg" },
          { name: "Root veggies", image: "/products/tomatoes.jpg" },
          { name: "Exotic", image: "/products/broccoli.jpg" },
          { name: "Peppers", image: "/products/peppers.jpg" },
        ]),
      }),
      cat({
        slug: "fruits",
        name: "Fresh Fruits",
        shortName: "Fruits",
        homeCategory: "Fruits",
        image: homeImage("Fruits"),
        subcategories: subs([
          { name: "Premium Fruits", image: "/products/green-apples.jpg" },
          { name: "Banana", image: "/products/bananas.jpg" },
          { name: "Citrus Fruits", image: "/products/oranges.jpg" },
          { name: "Seasonal", image: homeImage("Fruits") },
        ]),
      }),
      cat({
        slug: "bakery",
        name: "Breads & Bakery",
        shortName: "Bakery",
        homeCategory: "Bakery",
        image: homeImage("Bakery"),
        subcategories: subs([
          { name: "Bread", image: "/products/baguette.jpg" },
          { name: "Garlic bread", image: "/products/garlic-bread.jpg" },
          { name: "Rusk", image: homeImage("Bakery") },
        ]),
      }),
      cat({
        slug: "dairy-eggs",
        name: "Milk & Milk Products",
        shortName: "Dairy",
        homeCategory: "Dairy & Eggs",
        image: homeImage("Dairy & Eggs"),
        subcategories: subs([
          { name: "Milk", image: "/products/milk.jpg" },
          { name: "Cheese", image: "/products/cheese.jpg" },
          { name: "Eggs", image: homeImage("Dairy & Eggs") },
        ]),
      }),
      cat({
        slug: "cheese-paneer",
        name: "Cheese, Paneer & Tofu",
        shortName: "Paneer",
        homeCategory: "Dairy & Eggs",
        image: "/products/cheese.jpg",
      }),
      cat({
        slug: "batter",
        name: "Batter & Chutney",
        shortName: "Batter",
        homeCategory: "Bakery",
        image: "/products/pasta.jpg",
      }),
      cat({
        slug: "ice-cream",
        name: "Ice Cream & Frozen",
        shortName: "Frozen",
        homeCategory: "Dairy & Eggs",
        image: "/products/jug.jpg",
      }),
      // 7 tiles: rect(2) + 6 squares = full 4-col rows
    ],
  },
  {
    id: "packaged",
    title: "Drinks & Packaged Foods",
    subtitle: "Beverages, snacks & ready-to-eat",
    layout: "square-then-rect",
    categories: [
      cat({
        slug: "beverages",
        name: "Drinks & Juices",
        shortName: "Drinks",
        homeCategory: "Beverages",
        image: homeImage("Beverages"),
        subcategories: subs([
          { name: "Soft drinks", image: "/products/cola-can.jpg" },
          { name: "Juices", image: "/products/fanta.jpg" },
          { name: "Sparkling", image: "/products/sprite.jpg" },
        ]),
      }),
      cat({
        slug: "snacks",
        name: "Chips & Namkeens",
        shortName: "Chips",
        homeCategory: "Snacks",
        image: homeImage("Snacks"),
        subcategories: subs([
          { name: "Chips", image: "/products/chips-close.jpg" },
          { name: "Nuts", image: "/products/nuts.jpg" },
          { name: "Namkeen", image: homeImage("Snacks") },
        ]),
      }),
      cat({
        slug: "biscuits",
        name: "Biscuits & Cookies",
        shortName: "Biscuits",
        homeCategory: "Snacks",
        image: "/products/cornflakes.jpg",
      }),
      cat({
        slug: "chocolates",
        name: "Chocolates & Candies",
        shortName: "Sweets",
        homeCategory: "Snacks",
        image: "/products/nuts.jpg",
      }),
      cat({
        slug: "cereals",
        name: "Breakfast Cereals",
        shortName: "Cereals",
        homeCategory: "Bakery",
        image: "/products/cornflakes.jpg",
      }),
      cat({
        slug: "noodles",
        name: "Noodles & Pasta",
        shortName: "Pasta",
        homeCategory: "Snacks",
        image: "/products/pasta.jpg",
      }),
      // 6 tiles: sq(1) + rect(3) + 4 squares = full 4-col rows
    ],
  },
];

/** Resolve hub tile shape for index within a section. */
export function resolveHubTileShape(
  layout: CatalogSectionLayout,
  index: number,
  explicit?: CatalogTileShape,
): CatalogTileShape {
  if (explicit) return explicit;
  if (layout === "rect-first") return index === 0 ? "rect" : "square";
  if (layout === "square-then-rect") {
    if (index === 0) return "square";
    if (index === 1) return "rect";
    return "square";
  }
  return "square";
}

/**
 * Column span in a 4-col hub grid.
 * square-then-rect: featured rect fills the rest of the row (3 cols)
 * so the first row is never short.
 */
export function resolveHubTileSpan(
  layout: CatalogSectionLayout,
  index: number,
  shape: CatalogTileShape,
): 1 | 2 | 3 {
  if (shape !== "rect") return 1;
  if (layout === "square-then-rect" && index === 1) return 3;
  return 2;
}

export function listCatalogCategories(): CatalogCategory[] {
  return CATALOG_SECTIONS.flatMap((s) => s.categories);
}

export function getCatalogCategory(slug: string): CatalogCategory | undefined {
  return listCatalogCategories().find((c) => c.slug === slug);
}

export function getDefaultCatalogSlug(): string {
  return "fruits";
}

/** Primary PLP slug for each home-rail category (not secondary hub tiles). */
const HOME_TO_SLUG: Record<HomeCategory, string> = {
  Fruits: "fruits",
  Vegetables: "vegetables",
  Bakery: "bakery",
  "Dairy & Eggs": "dairy-eggs",
  Beverages: "beverages",
  Snacks: "snacks",
};

export function catalogSlugForHomeCategory(name: HomeCategory): string {
  return HOME_TO_SLUG[name];
}
