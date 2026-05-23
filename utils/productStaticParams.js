/**
 * Build-time product slugs for `output: 'export'` (`/products/[id]/index.html` per SKU).
 */

import { products as staticProducts } from '../data/products';
import { resolveProductDetailSegment } from './productApi';
import {
  fetchAtBuildTime,
  getBuildApiBaseUrl,
  unwrapApiPayload,
  warnBuildApiUnavailable,
} from './buildTimeApi';
import { extractStorefrontProductsPayload } from './productApi';

function segmentFromRawApiProduct(apiProduct) {
  if (!apiProduct || typeof apiProduct !== 'object') return '';
  return resolveProductDetailSegment({
    slug: apiProduct.slug,
    product_slug: apiProduct.product_slug,
    productSlug: apiProduct.productSlug,
    name: apiProduct.name,
    id: apiProduct.id,
  });
}

/** @returns {Promise<Array<{ id: string }>>} */
export async function generateProductDetailStaticParams() {
  if (process.env.NODE_ENV !== 'production') return [];

  const shopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';

  const segments = new Set();

  try {
    const base = getBuildApiBaseUrl();
    const headers = { Accept: 'application/json' };
    if (shopId) headers['x-shop-id'] = shopId;

    let cursor = null;
    let pages = 0;
    const maxPages = 120;

    while (pages < maxPages) {
      const qs = new URLSearchParams({ limit: '50' });
      if (cursor) qs.set('cursor', cursor);

      const url = `${base}/storefront/products?${qs.toString()}`;
      const json = unwrapApiPayload(await fetchAtBuildTime(url, { headers }));
      const { rawProducts: list, nextCursor } = extractStorefrontProductsPayload(json);

      if (!Array.isArray(list) || list.length === 0) break;

      for (const p of list) {
        const seg = segmentFromRawApiProduct(p);
        if (seg) segments.add(seg);
      }

      pages += 1;
      cursor = nextCursor != null && String(nextCursor).trim() ? String(nextCursor).trim() : null;
      if (!cursor) break;
    }
  } catch (err) {
    warnBuildApiUnavailable('Product list for static params', err);
  }

  for (const p of staticProducts || []) {
    const seg = resolveProductDetailSegment(p);
    if (seg) segments.add(seg);
  }

  return Array.from(segments).map((id) => ({ id }));
}
