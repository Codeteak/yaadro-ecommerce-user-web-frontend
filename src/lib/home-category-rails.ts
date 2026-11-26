/**
 * Build per-category product rails for home from the already-loaded catalog.
 * Pure — no React, relative imports only (unit-testable).
 */

import { PRODUCE_BROWSE_SLUGS } from "./home-category-browse.ts";

export type CategoryRailCategory = {
  slug: string;
  name: string;
};

export type CategoryProductRail = {
  slug: string;
  title: string;
  products: { id: string }[];
};

export type CategoryProductRailsOptions = {
  /** Slugs already covered by another home band (default: fruits + vegetables). */
  exclude?: Iterable<string>;
  /** Cap cards per horizontal row. */
  maxPerRail?: number;
};

const DEFAULT_MAX = 10;

/**
 * One rail per category that has products. Skips empty / excluded slugs,
 * dedupes within a row, keeps category order.
 * Live `productsBySlug` is seeded from the home browse page (plus a soft
 * PLP fill for empty roots). Show all still uses `/categories/[slug]`.
 */
export function categoryProductRails<T extends { id: string }>(
  categories: CategoryRailCategory[],
  productsBySlug: Record<string, T[]>,
  options?: CategoryProductRailsOptions,
): { slug: string; title: string; products: T[] }[] {
  const exclude = new Set(options?.exclude ?? PRODUCE_BROWSE_SLUGS);
  const max = options?.maxPerRail ?? DEFAULT_MAX;
  const rails: { slug: string; title: string; products: T[] }[] = [];

  for (const category of categories) {
    if (exclude.has(category.slug)) continue;
    const bucket = productsBySlug[category.slug] ?? [];
    if (bucket.length === 0) continue;

    const seen = new Set<string>();
    const products: T[] = [];
    for (const product of bucket) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
      if (products.length >= max) break;
    }
    if (products.length === 0) continue;

    rails.push({
      slug: category.slug,
      title: category.name,
      products,
    });
  }

  return rails;
}
