/**
 * Storefront SEO API — `GET /api/seo/metadata?pageType=shop|product`
 * Shop-level SEO also arrives on `GET /shops/resolve-by-domain` as `seo`.
 */

import { api } from './apiClient';
import {
  fetchAtBuildTime,
  getBuildApiBaseUrl,
  unwrapApiPayload,
  warnBuildApiUnavailable,
} from './buildTimeApi';
import { extractSeoFromPayload, isUuidSegment, normalizeSeoBlock } from './seoBlock';
import { RESOLVED_SHOP_ID_STORAGE_KEY } from './shopResolver';

function envShopId() {
  return process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';
}

function readBrowserShopId() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

async function resolveShopIdForRequest(explicitShopId) {
  if (explicitShopId) return String(explicitShopId).trim();
  if (typeof window !== 'undefined') {
    const cached = readBrowserShopId();
    if (cached) return cached;
    if (process.env.NODE_ENV !== 'production') {
      return envShopId();
    }
  }
  return envShopId();
}

/**
 * @param {object} params
 * @param {'shop'|'product'} params.pageType
 * @param {string} [params.slug]
 * @param {string} [params.shopId]
 */
export async function fetchSeoMetadata(params) {
  const pageType = params?.pageType;
  if (!pageType) return null;

  const shopId = await resolveShopIdForRequest(params.shopId);
  const query = { pageType };
  if (params.slug) query.slug = String(params.slug).trim();

  const isServer = typeof window === 'undefined';

  if (isServer) {
    if (!shopId && pageType !== 'shop') return null;
    const base = getBuildApiBaseUrl();
    const qs = new URLSearchParams(query).toString();
    const headers = { Accept: 'application/json' };
    if (shopId) headers['x-shop-id'] = shopId;
    try {
      const json = unwrapApiPayload(
        await fetchAtBuildTime(`${base}/seo/metadata?${qs}`, { headers, timeoutMs: 12_000 })
      );
      return {
        seo: normalizeSeoBlock(json?.seo),
        pageType: json?.pageType || pageType,
        productId: json?.productId,
        slug: json?.slug,
      };
    } catch (err) {
      // Soft-fail: local SSR / wrong shop often 400; build gets a one-line warn only.
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        warnBuildApiUnavailable(`fetchSeoMetadata(${pageType})`, err);
      }
      return null;
    }
  }

  if (!shopId) return null;

  try {
    const json = await api.get('/seo/metadata', {
      query,
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });
    const layer = json?.seo ? json : unwrapApiPayload(json);
    return {
      seo: normalizeSeoBlock(layer?.seo),
      pageType: layer?.pageType || pageType,
      productId: layer?.productId,
      slug: layer?.slug,
    };
  } catch {
    return null;
  }
}

/** Product PDP — slug only (`productId` query is not supported). */
export async function fetchProductSeoMetadata(lookup, shopId) {
  const segment = lookup != null ? String(lookup).trim() : '';
  if (!segment || isUuidSegment(segment)) return null;

  return fetchSeoMetadata({ pageType: 'product', shopId, slug: segment });
}

/** Shop home — prefers `seo` on resolve-by-domain payload; optional `/seo/metadata` fallback. */
export function extractShopSeoFromResolvePayload(payload) {
  return extractSeoFromPayload(payload);
}

export async function fetchShopSeoMetadata(shopId) {
  return fetchSeoMetadata({ pageType: 'shop', shopId });
}
