/**
 * Client-side "Buy Again" ranking — mirrors orders page scoring.
 * Excludes already-ordered product IDs; ranks remaining catalog by name/category overlap.
 */

function flattenOrderedItems(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.flatMap((o) => (Array.isArray(o?.items) ? o.items : []));
}

function collectOrderedProductIds(orderedItems) {
  return new Set(
    orderedItems
      .map((item) => item?.productId ?? item?.product?.id ?? item?.id)
      .filter((id) => id != null)
      .map((id) => String(id))
  );
}

function collectOrderedCategoryNames(orderedItems) {
  const names = new Set();
  orderedItems.forEach((item) => {
    const cat = (
      item?.category?.name ??
      item?.category ??
      item?.categoryName ??
      item?.product?.category?.name ??
      item?.product?.category ??
      ''
    )
      .toString()
      .trim()
      .toLowerCase();
    if (cat) names.add(cat);
  });
  return names;
}

/**
 * @param {object[]} recommendPool - catalog products
 * @param {object[]} orders - order list with items
 * @param {{ limit?: number }} [opts]
 * @returns {object[]} ranked buy-again candidates
 */
export function getBuyAgainFavorites(recommendPool, orders, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 12);
  if (!Array.isArray(recommendPool) || !recommendPool.length) return [];

  const allOrderedItems = flattenOrderedItems(orders);
  if (!allOrderedItems.length) return [];

  const orderedProductIds = collectOrderedProductIds(allOrderedItems);
  const orderedCategoryNames = collectOrderedCategoryNames(allOrderedItems);

  const eligible = recommendPool.filter(
    (p) => p?.id != null && !orderedProductIds.has(String(p.id))
  );
  if (!eligible.length) return [];

  const poolIndex = new Map(eligible.map((p, i) => [String(p.id), i]));

  const productCategoryKey = (p) =>
    (
      p?.category?.name ??
      p?.category ??
      p?.categoryName ??
      p?.category_name ??
      ''
    )
      .toString()
      .trim()
      .toLowerCase();

  const matchesOrderedCategory = (p) => {
    const c = productCategoryKey(p);
    return Boolean(c && orderedCategoryNames.has(c));
  };

  const orderedNameTokens = new Set(
    allOrderedItems
      .map((item) => item?.productName ?? item?.name ?? '')
      .map((name) => String(name).trim().toLowerCase())
      .filter(Boolean)
      .flatMap((name) => name.split(/\s+/).filter((w) => w.length >= 4))
  );

  const nameTokenHits = (p) => {
    const name = (p?.name ?? '').toString().trim().toLowerCase();
    if (!name || orderedNameTokens.size === 0) return 0;
    let hits = 0;
    for (const t of orderedNameTokens) {
      if (name.includes(t)) hits += 1;
    }
    return hits;
  };

  const sortByNewest = (a, b) =>
    (poolIndex.get(String(a.id)) ?? 0) - (poolIndex.get(String(b.id)) ?? 0);

  const buyAgainScore = (p) =>
    nameTokenHits(p) * 4 + (matchesOrderedCategory(p) ? 1 : 0);

  const buyAgainSorted = [...eligible].sort((a, b) => {
    const s = buyAgainScore(b) - buyAgainScore(a);
    if (s !== 0) return s;
    return sortByNewest(a, b);
  });

  const used = new Set();
  const out = [];
  for (const p of buyAgainSorted) {
    if (out.length >= limit) break;
    const id = String(p.id);
    if (used.has(id)) continue;
    used.add(id);
    out.push(p);
  }
  return out;
}
