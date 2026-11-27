import { PRODUCE_BROWSE_SLUGS } from "@/lib/home-category-browse";
import { homeCategoryImage } from "@/lib/home-categories";

export type ProduceFilter = "All" | "Fruits" | "Vegetables";

export { PRODUCE_BROWSE_SLUGS };

/** Canonical display names on the produce PLP rail. */
export const PRODUCE_RAIL_LABELS = {
  fruits: "Fruits",
  vegetables: "Vegetables",
} as const;

export function isProducePlpSlug(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim().toLowerCase();
  return Boolean(trimmed && PRODUCE_BROWSE_SLUGS.has(trimmed));
}

/**
 * Home Fruits & veggies → produce PLP (`/categories/fruits|vegetables`),
 * not the shop-wide Categories hub.
 *
 * - All → `/categories/fruits` (All selected; Fruits + Vegetables rails)
 * - Fruits → `/categories/fruits?aisle=fruits`
 * - Vegetables → `/categories/vegetables?aisle=vegetables`
 */
export function producePlpHref(filter: ProduceFilter = "All"): string {
  if (filter === "Vegetables") {
    return "/categories/vegetables?aisle=vegetables";
  }
  if (filter === "Fruits") {
    return "/categories/fruits?aisle=fruits";
  }
  return "/categories/fruits";
}

/**
 * Map URL slug + optional `aisle` query to the PLP rail selection.
 * Missing / `all` → All (union of fruits + vegetables).
 */
export function produceInitialSub(
  slug: string,
  aisle?: string | null,
): ProduceFilter {
  const raw = (aisle ?? "").trim().toLowerCase();
  if (raw === "fruits" || raw === "fruit") return "Fruits";
  if (raw === "vegetables" || raw === "vegetable" || raw === "veggies") {
    return "Vegetables";
  }
  if (raw === "all" || raw === "") {
    // Bare `/categories/fruits` from “Browse all” on All → union.
    // `?aisle=fruits|vegetables` selects that aisle.
    return "All";
  }
  if (isProducePlpSlug(slug) && (raw === slug.trim().toLowerCase())) {
    return slug.trim().toLowerCase() === "vegetables" ? "Vegetables" : "Fruits";
  }
  return "All";
}

export function produceRailImage(slug: "fruits" | "vegetables"): string {
  return slug === "fruits"
    ? homeCategoryImage("Fruits")
    : homeCategoryImage("Vegetables");
}
