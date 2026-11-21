import { SAMPLE_PRODUCTS, type SampleProduct } from "@/lib/sample-products";

/**
 * Festive home section helpers.
 * Live /home + /festive pick a shop home-section by title keywords;
 * playground demos use SAMPLE_FESTIVE_SHELF.
 */

export const FESTIVE_SECTION_BG = "/home/festive-section.jpg";

/** Title keywords that mark a home shelf as festive (case-insensitive). */
const FESTIVE_TITLE_RE = /\b(festive|festival|celebration|celebrate)\b/i;

export function isFestiveSectionTitle(title: string): boolean {
  return FESTIVE_TITLE_RE.test(title.trim());
}

export type FestiveShelf = {
  id: string;
  title: string;
  products: SampleProduct[];
};

/** Sample festive shelf for playground demos. */
export const SAMPLE_FESTIVE_SHELF: FestiveShelf = {
  id: "playground-festive",
  /** Distinct sample title so playground shows admin-name wiring. */
  title: "Diwali festive specials",
  products: SAMPLE_PRODUCTS.filter((p) =>
    ["Snacks", "Beverages", "Fruits"].includes(p.category),
  ).slice(0, 12),
};

export function pickFestiveShelf(
  shelves: FestiveShelf[] | undefined | null,
): FestiveShelf | null {
  if (!shelves?.length) return null;
  const match = shelves.find(
    (shelf) =>
      isFestiveSectionTitle(shelf.title) && shelf.products.length > 0,
  );
  return match ?? null;
}
