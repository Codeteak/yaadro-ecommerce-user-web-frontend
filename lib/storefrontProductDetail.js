/**
 * Customer-API path for storefront product detail GETs.
 * UUIDs must hit `/products/id/:id` (Zod uuid); slugs hit `/products/:slug`.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string | null | undefined} idOrSlug
 * @returns {string | null} upstream path under customer API, or null if missing
 */
export function resolveStorefrontProductUpstreamPath(idOrSlug) {
  if (idOrSlug == null) return null;
  const raw = String(idOrSlug).trim();
  if (!raw) return null;
  const segment = encodeURIComponent(raw);
  if (UUID_RE.test(raw)) {
    return `/api/storefront/products/id/${segment}`;
  }
  return `/api/storefront/products/${segment}`;
}

/**
 * Same-category related list: drop current product, cap length.
 * @param {unknown[]} rows
 * @param {string | null | undefined} excludeProductId
 * @param {number} [limit=12]
 * @returns {unknown[]}
 */
export function filterRelatedProducts(rows, excludeProductId, limit = 12) {
  const list = Array.isArray(rows) ? rows : [];
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 12;
  if (excludeProductId == null || String(excludeProductId).trim() === '') {
    return list.slice(0, cap);
  }
  const exclude = String(excludeProductId);
  return list
    .filter((p) => p?.id != null && String(p.id) !== exclude)
    .slice(0, cap);
}
