/**
 * Build cart/checkout “suggested products” lists from a catalog pool.
 *
 * IMPORTANT: Do NOT exclude products already in the cart. ProductCard derives
 * quantity from cart state — if we filter them out after Add, the card unmounts
 * and the user never sees − / qty / + controls.
 *
 * @param {object[]} pool
 * @param {{ limit?: number, categoryNames?: Set<string>|string[] }} [opts]
 * @returns {object[]}
 */
export function buildSuggestedProducts(pool, opts = {}) {
  const limit = Math.max(0, Number(opts.limit) || 12);
  if (!Array.isArray(pool) || pool.length === 0 || limit === 0) return [];

  const candidates = pool.filter((p) => p?.id != null);
  if (candidates.length === 0) return [];

  const categoryNames = opts.categoryNames;
  const catSet =
    categoryNames instanceof Set
      ? categoryNames
      : Array.isArray(categoryNames)
        ? new Set(
            categoryNames
              .filter((c) => typeof c === 'string' && c.trim())
              .map((c) => c.trim().toLowerCase()),
          )
        : null;

  if (!catSet || catSet.size === 0) {
    return candidates.slice(0, limit);
  }

  const matchesCart = (p) => {
    const pc = (p?.category?.name ?? p?.category ?? p?.categoryName ?? '')
      .toString()
      .trim()
      .toLowerCase();
    return Boolean(pc && catSet.has(pc));
  };

  const priority = candidates.filter(matchesCart);
  const others = candidates.filter((p) => !matchesCart(p));
  return [...priority, ...others].slice(0, limit);
}

/**
 * Slice a catalog pool into non-overlapping carousel sections (checkout / empty cart).
 * Same rule: never drop products merely because they are already in the cart.
 *
 * @param {object[]} pool
 * @param {{ sections: Array<{ key: string, title: string, description?: string, start: number, end: number }> }} opts
 */
export function buildSuggestedProductSections(pool, opts) {
  const list = Array.isArray(pool) ? pool.filter((p) => p?.id != null) : [];
  const sections = Array.isArray(opts?.sections) ? opts.sections : [];
  return sections
    .map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      products: list.slice(s.start, s.end),
    }))
    .filter((s) => s.products.length > 0);
}
