import { dedupeProductsByVariantGroup } from '../../utils/productUtils';

export const DISCOVER_PER_SECTION = 12;

/** Stable id for deduping carousel rows across API lists. */
export function discoverProductKey(p) {
  const id = p?.id ?? p?.productId;
  if (id == null || id === '') return null;
  return String(id);
}

/**
 * Split one newest catalog list into three discover carousels (no extra API sorts).
 */
export function partitionDiscoverFromCatalog(catalogList, maxEach = DISCOVER_PER_SECTION) {
  const catalog = dedupeProductsByVariantGroup(Array.isArray(catalogList) ? catalogList : []);
  const used = new Set();

  const takeSlice = (start, preferDiscount) => {
    const out = [];
    for (let i = start; i < catalog.length && out.length < maxEach; i += 1) {
      const p = catalog[i];
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      if (preferDiscount) {
        const hasDeal =
          p.discountPercentage > 0 ||
          (p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price));
        if (!hasDeal && out.length < maxEach / 2) {
          // soft prefer deals but still fill
        }
      }
      used.add(k);
      out.push(p);
    }
    for (const p of catalog) {
      if (out.length >= maxEach) break;
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      used.add(k);
      out.push(p);
    }
    return out;
  };

  const fresh = takeSlice(0, false);
  const picks = takeSlice(Math.min(8, catalog.length), false);
  const byPrice = [...catalog].sort(
    (a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
  );
  const deals = [];
  for (const p of byPrice) {
    if (deals.length >= maxEach) break;
    const k = discoverProductKey(p);
    if (!k || used.has(k)) continue;
    used.add(k);
    deals.push(p);
  }
  for (const p of catalog) {
    if (deals.length >= maxEach) break;
    const k = discoverProductKey(p);
    if (!k || used.has(k)) continue;
    used.add(k);
    deals.push(p);
  }

  return { fresh, picks, deals };
}

export function buildDiscoverSections(catalogProducts) {
  const { fresh, picks, deals } = partitionDiscoverFromCatalog(
    catalogProducts,
    DISCOVER_PER_SECTION
  );
  return [
    {
      key: 'search-fallback-new',
      title: 'Fresh arrivals',
      description: 'Recently added products across the store.',
      products: fresh,
    },
    {
      key: 'search-fallback-popular',
      title: 'Popular picks',
      description: 'Customer favorites people reorder often.',
      products: picks,
    },
    {
      key: 'search-fallback-budget',
      title: 'Value deals',
      description: 'Budget-friendly picks for your basket.',
      products: deals,
    },
  ];
}
