/**
 * Seed home `productsBySlug` from a single uncategoized browse page by
 * walking each product's category up to its sellable root. Pure / testable.
 */

export type BucketCategory = {
  id: string;
  slug: string;
  parentId: string | null;
};

export type BucketProduct = {
  id: string;
  categoryId?: string;
  categorySlug?: string;
};

/** Walk parent links until a root (no parent). Skips synthetic `all`. */
export function resolveRootSlug(
  startId: string | undefined,
  byId: Map<string, BucketCategory>,
): string | null {
  let id = startId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const category = byId.get(id);
    if (!category || category.slug === "all") return null;
    if (!category.parentId) return category.slug;
    id = category.parentId;
  }
  return null;
}

/**
 * Group browse products under root slugs. Prefers walking `categoryId`;
 * falls back to `categorySlug` when it matches a known root.
 */
export function bucketProductsByRootSlug<T extends BucketProduct>(
  categories: BucketCategory[],
  products: T[],
): Record<string, T[]> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const rootSlugs = new Set(
    categories
      .filter((category) => !category.parentId && category.slug !== "all")
      .map((category) => category.slug),
  );

  const buckets: Record<string, T[]> = {};
  const seenInSlug = new Map<string, Set<string>>();

  const push = (slug: string, product: T) => {
    let seen = seenInSlug.get(slug);
    if (!seen) {
      seen = new Set();
      seenInSlug.set(slug, seen);
    }
    if (seen.has(product.id)) return;
    seen.add(product.id);
    if (!buckets[slug]) buckets[slug] = [];
    buckets[slug].push(product);
  };

  for (const product of products) {
    const fromWalk = resolveRootSlug(product.categoryId, byId);
    if (fromWalk) {
      push(fromWalk, product);
      continue;
    }
    const slug = product.categorySlug?.trim();
    if (slug && rootSlugs.has(slug)) {
      push(slug, product);
    }
  }

  return buckets;
}
