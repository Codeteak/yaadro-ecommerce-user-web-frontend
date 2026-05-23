/**
 * Resolve shop tenant (id, name, logo) for the current domain via GET /shops/resolve-by-domain.
 * Cached in localStorage per hostname. Used for branding, splash, and x-shop-id flows.
 */

import { getStorefrontApiBaseUrl } from './apiBases';

export const RESOLVED_SHOP_ID_STORAGE_KEY = 'yaadro_resolved_shop_id';
export const RESOLVED_SHOP_HOST_STORAGE_KEY = 'yaadro_resolved_shop_host';
export const RESOLVED_SHOP_NAME_STORAGE_KEY = 'yaadro_resolved_shop_name';
export const RESOLVED_SHOP_IMAGE_STORAGE_KEY = 'yaadro_resolved_shop_image';

const DEFAULT_SHOP_NAME = 'Yaadro';

function getDefaultTenantResolverUrl() {
  const apiBase = getStorefrontApiBaseUrl();
  if (!apiBase) return '';
  return `${apiBase}/shops/resolve-by-domain`;
}

function envShopId() {
  return process.env.NEXT_PUBLIC_SHOP_ID ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim() : '';
}

function envShopName() {
  return process.env.NEXT_PUBLIC_SHOP_NAME
    ? String(process.env.NEXT_PUBLIC_SHOP_NAME).trim()
    : '';
}

function envShopImage() {
  const raw = process.env.NEXT_PUBLIC_SHOP_IMAGE
    ? String(process.env.NEXT_PUBLIC_SHOP_IMAGE).trim()
    : '';
  return raw || null;
}

/** @returns {{ shopId: string, shopName: string, shopImage: string|null }} */
export function normalizeShopResolvePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { shopId: '', shopName: '', shopImage: null };
  }
  const root = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const shopId = String(
    root.shopId ?? root.shop_id ?? root.tenantId ?? root.tenant_id ?? ''
  ).trim();
  const shopName = String(root.shopName ?? root.shop_name ?? '').trim();
  const shopImageRaw = root.shopImage ?? root.shop_image ?? null;
  const shopImage =
    shopImageRaw != null && String(shopImageRaw).trim() ? String(shopImageRaw).trim() : null;
  return { shopId, shopName, shopImage };
}

function readCachedBranding(domain) {
  if (typeof window === 'undefined' || !domain) return null;
  const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
  if (cachedHost !== domain) return null;
  const shopId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  if (!shopId) return null;
  const shopName = window.localStorage.getItem(RESOLVED_SHOP_NAME_STORAGE_KEY) || '';
  const shopImage = window.localStorage.getItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY) || '';
  return {
    shopId,
    shopName: shopName || DEFAULT_SHOP_NAME,
    shopImage: shopImage || null,
  };
}

export function persistResolvedShop(domain, { shopId, shopName, shopImage }) {
  if (typeof window === 'undefined' || !domain || !shopId) return;
  window.localStorage.setItem(RESOLVED_SHOP_HOST_STORAGE_KEY, domain);
  window.localStorage.setItem(RESOLVED_SHOP_ID_STORAGE_KEY, shopId);
  window.localStorage.setItem(RESOLVED_SHOP_NAME_STORAGE_KEY, shopName || DEFAULT_SHOP_NAME);
  if (shopImage) {
    window.localStorage.setItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY, shopImage);
  } else {
    window.localStorage.removeItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY);
  }
}

function devBrandingFallback() {
  return {
    shopId: envShopId(),
    shopName: envShopName() || DEFAULT_SHOP_NAME,
    shopImage: envShopImage(),
    fromCache: false,
    notFound: false,
  };
}

/**
 * Fetch shop branding for hostname (production domain resolver).
 * @returns {Promise<{ shopId: string, shopName: string, shopImage: string|null, notFound?: boolean }>}
 */
export async function fetchShopByDomain(domain) {
  const resolverUrl = process.env.NEXT_PUBLIC_TENANT_RESOLVER_URL
    ? String(process.env.NEXT_PUBLIC_TENANT_RESOLVER_URL).trim()
    : getDefaultTenantResolverUrl();
  if (!resolverUrl || !domain) {
    return { shopId: '', shopName: '', shopImage: null, notFound: true };
  }

  try {
    const url = new URL(resolverUrl);
    url.searchParams.set('domain', domain);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      return { shopId: '', shopName: '', shopImage: null, notFound: true };
    }
    if (!response.ok) {
      return { shopId: '', shopName: '', shopImage: null, notFound: false };
    }

    const payload = await response.json();
    const normalized = normalizeShopResolvePayload(payload);
    if (!normalized.shopId) {
      return { shopId: '', shopName: '', shopImage: null, notFound: true };
    }
    return {
      shopId: normalized.shopId,
      shopName: normalized.shopName || DEFAULT_SHOP_NAME,
      shopImage: normalized.shopImage,
      notFound: false,
    };
  } catch {
    return { shopId: '', shopName: '', shopImage: null, notFound: false };
  }
}

/**
 * Resolve shop for current origin (id + display name + logo URL).
 * Development: `NEXT_PUBLIC_SHOP_ID` + optional `NEXT_PUBLIC_SHOP_NAME` / `NEXT_PUBLIC_SHOP_IMAGE`.
 * Production: domain resolver API with localStorage cache.
 */
export async function resolveShopBranding() {
  if (typeof window === 'undefined') {
    return {
      shopId: envShopId(),
      shopName: envShopName() || DEFAULT_SHOP_NAME,
      shopImage: envShopImage(),
      fromCache: false,
      notFound: false,
    };
  }

  const resolveByDomainInDev =
    process.env.NEXT_PUBLIC_RESOLVE_SHOP_BY_DOMAIN === 'true';

  if (process.env.NODE_ENV !== 'production' && !resolveByDomainInDev) {
    return devBrandingFallback();
  }

  const domain = String(window.location.hostname || '').toLowerCase().trim();
  if (!domain) {
    return {
      shopId: '',
      shopName: DEFAULT_SHOP_NAME,
      shopImage: null,
      fromCache: false,
      notFound: true,
    };
  }

  const cached = readCachedBranding(domain);
  if (cached) {
    return { ...cached, fromCache: true, notFound: false };
  }

  const fetched = await fetchShopByDomain(domain);
  if (fetched.shopId) {
    persistResolvedShop(domain, fetched);
    return { ...fetched, fromCache: false, notFound: false };
  }

  const fallbackId = envShopId();
  if (fallbackId) {
    const fallback = {
      shopId: fallbackId,
      shopName: envShopName() || DEFAULT_SHOP_NAME,
      shopImage: envShopImage(),
      fromCache: false,
      notFound: !!fetched.notFound,
    };
    persistResolvedShop(domain, fallback);
    return fallback;
  }

  return {
    shopId: '',
    shopName: DEFAULT_SHOP_NAME,
    shopImage: null,
    fromCache: false,
    notFound: !!fetched.notFound,
  };
}

/** Shop UUID only — backward compatible with existing callers. */
export async function resolveShopIdFromDomain() {
  const branding = await resolveShopBranding();
  return branding.shopId || '';
}

/** `Page Title | Shop Name` (or shop name only when page title omitted). */
export function formatShopPageTitle(pageTitle, shopName) {
  const shop = (shopName || DEFAULT_SHOP_NAME).trim() || DEFAULT_SHOP_NAME;
  const page = pageTitle != null ? String(pageTitle).trim() : '';
  if (!page) return shop;
  if (page.toLowerCase() === shop.toLowerCase()) return shop;
  return `${page} | ${shop}`;
}
