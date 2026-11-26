import {
  getProductsByCategory,
  type SampleProduct,
} from "@/lib/sample-products";
import { homeCategoryImage } from "@/lib/home-categories";
import { isDairySectionTitle } from "@/lib/daily-dairy-title";

export { isDairySectionTitle } from "@/lib/daily-dairy-title";

/**
 * Daily dairy helpers.
 * Live /home + /dairy pick a shop home-section by title keywords;
 * playground demos use SAMPLE_DAIRY_SHELF. Default card layout is A (`on-art`).
 */

/**
 * Daily dairy card art (682×1024). Card uses the same aspect so the long
 * yellow top isn’t cropped by object-cover.
 */
export const DAILY_DAIRY_SECTION_BG = "/home/daily-dairy-section-v2.jpg";

/** Intrinsic art size — keep card `aspect-[DAIRY_ART_W/DAIRY_ART_H]`. */
export const DAIRY_ART_W = 682;
export const DAIRY_ART_H = 1024;

export type DairyCategory = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

export type DairyShelf = {
  id: string;
  title: string;
  subtitle?: string;
  /** Child categories from admin — omit / empty → no rail, products only. */
  categories?: DairyCategory[];
  products: SampleProduct[];
};

export function pickDairyShelf(
  shelves:
    | { id: string; title: string; products: SampleProduct[]; subtitle?: string }[]
    | undefined
    | null,
): DairyShelf | null {
  if (!shelves?.length) return null;
  const match = shelves.find(
    (shelf) => isDairySectionTitle(shelf.title) && shelf.products.length > 0,
  );
  if (!match) return null;
  return {
    id: match.id,
    title: match.title,
    subtitle: match.subtitle,
    products: match.products,
  };
}

/** Sample with child categories so playground shows the optional rail. */
export const SAMPLE_DAIRY_SHELF: DairyShelf = {
  id: "playground-dairy",
  title: "Daily dairy",
  subtitle: "Milk, eggs, and breakfast essentials",
  categories: [
    {
      id: "milk",
      name: "Milk",
      slug: "milk",
      image: "/products/milk.jpg",
    },
    {
      id: "eggs",
      name: "Eggs",
      slug: "eggs",
      image: homeCategoryImage("Dairy & Eggs"),
    },
  ],
  products: getProductsByCategory("Dairy & Eggs"),
};

/** Same products, no child categories — rail hidden. */
export const SAMPLE_DAIRY_SHELF_PRODUCTS_ONLY: DairyShelf = {
  id: "playground-dairy-products-only",
  title: "Daily dairy",
  subtitle: "Milk, eggs, and breakfast essentials",
  products: getProductsByCategory("Dairy & Eggs"),
};

/** Filter shelf products by a child category slug (name heuristics for samples). */
export function productsForDairyCategory(
  products: SampleProduct[],
  categorySlug: string | "all",
): SampleProduct[] {
  if (categorySlug === "all") return products;
  const slug = categorySlug.toLowerCase();
  if (slug.includes("egg")) {
    return products.filter((p) => /\begg/i.test(p.name));
  }
  if (
    slug.includes("milk") ||
    slug.includes("dairy") ||
    slug.includes("curd") ||
    slug.includes("butter") ||
    slug.includes("cheese")
  ) {
    return products.filter((p) =>
      /\bmilk\b|\bcurd\b|\bbutter\b|\bcheese\b|\bpaneer\b/i.test(p.name),
    );
  }
  return products.filter(
    (p) =>
      p.categorySlug?.toLowerCase() === slug ||
      p.category.toLowerCase().includes(slug),
  );
}
