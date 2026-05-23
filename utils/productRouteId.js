/** Reserved segment — not a real product (legacy Cloudflare shell path). */
export const PDP_SHELL_SEGMENT = '_pdp';

/**
 * Parse `/products/<slug>/` from a pathname (works after CF rewrite to `/product/index.html`).
 */
export function slugFromProductsPathname(pathname) {
  if (!pathname) return '';
  const m = String(pathname).match(/\/products\/([^/?#]+)\/?$/);
  if (!m) return '';
  try {
    const slug = decodeURIComponent(m[1]).trim();
    if (!slug || slug === PDP_SHELL_SEGMENT) return '';
    return slug;
  } catch {
    return '';
  }
}

/**
 * Resolve product slug/id for PDP data fetching (prop → query → route param → pathname).
 */
export function resolveProductRouteId({ productId, paramsId, searchParams } = {}) {
  if (productId != null && String(productId).trim()) {
    return String(productId).trim();
  }

  const fromQuery =
    searchParams?.get?.('id') || searchParams?.get?.('pid') || '';
  if (String(fromQuery).trim()) return String(fromQuery).trim();

  const fromParams = paramsId != null ? String(paramsId).trim() : '';
  if (fromParams && fromParams !== PDP_SHELL_SEGMENT) return fromParams;

  if (typeof window !== 'undefined') {
    return slugFromProductsPathname(window.location.pathname);
  }

  return fromParams;
}
