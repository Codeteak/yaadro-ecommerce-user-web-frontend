/**
 * Helpers for automatic cart / category offer copy on cart & checkout.
 */

export function getAppliedAutoCartOffers(promotions) {
  const list = promotions?.auto?.appliedOffers;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

export function getSuggestedAutoCartOffers(promotions) {
  const list = promotions?.auto?.suggestedOffers;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

/** Primary category-focused line for the applied automatic discount. */
export function getPrimaryAppliedAutoCartOffer(promotions) {
  const applied = getAppliedAutoCartOffers(promotions);
  return (
    applied.find((o) => o.kind === 'category_percent_off' && o.categoryName) ||
    applied.find((o) => o.kind === 'category_percent_off') ||
    applied[0] ||
    null
  );
}

export function formatAutoCartOfferPercent(offer) {
  const bps = Number(offer?.percentBps);
  if (!Number.isFinite(bps) || bps <= 0) return null;
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${Math.round(pct * 10) / 10}%`;
}

export function categoryProductsHref(categoryId) {
  if (!categoryId) return '/categories';
  return `/products?category=${encodeURIComponent(String(categoryId))}`;
}
