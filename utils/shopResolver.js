/**
 * Resolve shop tenant (id, name, logo) for the current domain via GET /shops/resolve-by-domain.
 * Cached in localStorage per hostname. Used for branding, splash, x-shop-id flows, and shop SEO.
 */

import { extractSeoFromPayload, normalizeSeoBlock } from './seoBlock';

export const RESOLVED_SHOP_ID_STORAGE_KEY = 'yaadro_resolved_shop_id';
export const RESOLVED_SHOP_HOST_STORAGE_KEY = 'yaadro_resolved_shop_host';
export const RESOLVED_SHOP_NAME_STORAGE_KEY = 'yaadro_resolved_shop_name';
export const RESOLVED_SHOP_IMAGE_STORAGE_KEY = 'yaadro_resolved_shop_image';
export const RESOLVED_SHOP_BANNER_ENABLED_KEY = 'yaadro_resolved_shop_banner_enabled';
export const RESOLVED_SHOP_BANNER_IMAGES_KEY = 'yaadro_resolved_shop_banner_images';
export const RESOLVED_SHOP_SEO_STORAGE_KEY = 'yaadro_resolved_shop_seo';
/** Bump when banner parsing changes — forces one refetch of resolve-by-domain. */
export const RESOLVED_SHOP_BANNER_PARSE_VERSION_KEY = 'yaadro_resolved_shop_banner_parse_v';
const CURRENT_BANNER_PARSE_VERSION = '2';

const DEFAULT_SHOP_NAME = 'Yaadro';

const BANNER_URL_KEYS = [
  'url',
  'image',
  'src',
  'imageUrl',
  'image_url',
  'bannerUrl',
  'banner_url',
  'fileUrl',
  'file_url',
  'mediaUrl',
  'media_url',
  'path',
];

/** Log resolve-by-domain API payload to the browser console (debug). */
function logShopDomainResolverResponse({ domain, url, status, payload, normalized, error }) {
  if (typeof console === 'undefined') return;
  // eslint-disable-next-line no-console
  console.log('[Shop domain resolver]', {
    domain,
    url,
    status,
    response: payload,
    normalized,
    ...(error ? { error: String(error) } : {}),
  });
}

/** @param {unknown} item */
function bannerItemToUrl(item) {
  if (typeof item === 'string') {
    const t = item.trim();
    return t || '';
  }
  if (!item || typeof item !== 'object') return '';

  const active = item.isActive ?? item.is_active ?? item.active;
  if (active === false || active === 0) return '';
  if (typeof active === 'string') {
    const a = active.trim().toLowerCase();
    if (a === 'false' || a === '0' || a === 'no') return '';
  }

  for (const key of BANNER_URL_KEYS) {
    const val = item[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return '';
}

/** @param {unknown} raw */
function normalizeBannerImages(raw) {
  if (raw == null) return [];

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        return normalizeBannerImages(JSON.parse(text));
      } catch {
        /* fall through */
      }
    }
    if (text.includes(',')) {
      return text
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [text];
  }

  if (!Array.isArray(raw)) {
    if (typeof raw === 'object') {
      const values = Object.values(raw);
      if (values.length > 0) return normalizeBannerImages(values);
    }
    return [];
  }

  const withOrder = raw
    .map((item, index) => {
      const url = bannerItemToUrl(item);
      if (!url) return null;
      let order = index;
      if (item && typeof item === 'object') {
        const o = item.sortOrder ?? item.sort_order ?? item.order ?? item.position ?? item.index;
        if (typeof o === 'number' && Number.isFinite(o)) order = o;
      }
      return { url, order };
    })
    .filter(Boolean);

  withOrder.sort((a, b) => a.order - b.order);

  const seen = new Set();
  const urls = [];
  for (const { url } of withOrder) {
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** Merge every known banner field from the resolve payload (deduped, ordered). */
function collectBannerImagesFromRoot(root) {
  if (!root || typeof root !== 'object') return [];

  const shop = root.shop ?? root.Shop;
  const sources = [
    root.banner_images,
    root.bannerImages,
    root.banners,
    root.shop_banners,
    root.shopBanners,
    root.banner_image,
    root.bannerImage,
    shop?.banner_images,
    shop?.bannerImages,
    shop?.banners,
    shop?.shop_banners,
    shop?.shopBanners,
  ];

  const seen = new Set();
  const merged = [];
  for (const source of sources) {
    for (const url of normalizeBannerImages(source)) {
      if (seen.has(url)) continue;
      seen.add(url);
      merged.push(url);
    }
  }
  return merged;
}

/** @param {unknown} raw */
function normalizeBannerEnabled(raw) {
  if (raw === true || raw === 1) return true;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    return t === 'true' || t === '1' || t === 'yes';
  }
  return false;
}

/** @param {unknown} raw */
function isBannerExplicitlyDisabled(raw) {
  if (raw === false || raw === 0) return true;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    return t === 'false' || t === '0' || t === 'no';
  }
  return false;
}

/** Unwrap `{ data }`, `{ shop }`, and success envelopes from resolve-by-domain. */
function unwrapResolvePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  let root = payload;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    root = root.data;
  }
  const shop = root.shop ?? root.Shop;
  if (shop && typeof shop === 'object') {
    root = { ...root, ...shop };
  }
  return root;
}

function getDefaultTenantResolverUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
    ? String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()
    : process.env.NEXT_PUBLIC_API_URL
      ? `${String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/+$/, '')}/api`
      : '';
  if (!base) return '';
  const apiBase = base.replace(/\/+$/, '');
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

/**
 * @returns {{
 *   shopId: string,
 *   shopName: string,
 *   shopImage: string|null,
 *   bannerEnabled: boolean,
 *   bannerImages: string[],
 *   seo: import('./seoBlock').SeoBlock|null,
 * }}
 */
export function normalizeShopResolvePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      shopId: '',
      shopName: '',
      shopImage: null,
      bannerEnabled: false,
      bannerImages: [],
      seo: null,
    };
  }
  const root = unwrapResolvePayload(payload);
  const shopId = String(
    root.shopId ?? root.shop_id ?? root.id ?? root.tenantId ?? root.tenant_id ?? ''
  ).trim();
  const shopName = String(root.shopName ?? root.shop_name ?? root.name ?? '').trim();
  const shopImageRaw = root.shopImage ?? root.shop_image ?? root.logo ?? root.logo_url ?? null;
  const shopImage =
    shopImageRaw != null && String(shopImageRaw).trim() ? String(shopImageRaw).trim() : null;
  const bannerImages = collectBannerImagesFromRoot(root);
  const bannerFlag = root.banner_enabled ?? root.bannerEnabled ?? root.banners_enabled;
  const bannerEnabled =
    bannerImages.length > 0 &&
    !isBannerExplicitlyDisabled(bannerFlag) &&
    (bannerFlag == null || normalizeBannerEnabled(bannerFlag));
  const seo = extractSeoFromPayload(payload);
  return { shopId, shopName, shopImage, bannerEnabled, bannerImages, seo };
}

function readCachedBranding(domain) {
  if (typeof window === 'undefined' || !domain) return null;
  const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
  if (cachedHost !== domain) return null;
  const shopId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  if (!shopId) return null;
  // Legacy cache from before banner fields — refetch resolve-by-domain once.
  if (window.localStorage.getItem(RESOLVED_SHOP_BANNER_ENABLED_KEY) == null) {
    return null;
  }
  if (
    window.localStorage.getItem(RESOLVED_SHOP_BANNER_PARSE_VERSION_KEY) !==
    CURRENT_BANNER_PARSE_VERSION
  ) {
    return null;
  }
  const shopName = window.localStorage.getItem(RESOLVED_SHOP_NAME_STORAGE_KEY) || '';
  const shopImage = window.localStorage.getItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY) || '';
  let bannerImages = [];
  try {
    const raw = window.localStorage.getItem(RESOLVED_SHOP_BANNER_IMAGES_KEY);
    if (raw) bannerImages = normalizeBannerImages(JSON.parse(raw));
  } catch {
    bannerImages = [];
  }
  const bannerEnabledRaw = window.localStorage.getItem(RESOLVED_SHOP_BANNER_ENABLED_KEY);
  const bannerEnabled =
    bannerImages.length > 0 &&
    bannerEnabledRaw !== 'false' &&
    (bannerEnabledRaw === 'true' || bannerEnabledRaw == null);
  let seo = null;
  try {
    const rawSeo = window.localStorage.getItem(RESOLVED_SHOP_SEO_STORAGE_KEY);
    if (rawSeo) seo = normalizeSeoBlock(JSON.parse(rawSeo));
  } catch {
    seo = null;
  }
  return {
    shopId,
    shopName: shopName || DEFAULT_SHOP_NAME,
    shopImage: shopImage || null,
    bannerEnabled,
    bannerImages,
    seo,
  };
}

export function persistResolvedShop(
  domain,
  { shopId, shopName, shopImage, bannerEnabled = false, bannerImages = [], seo = null }
) {
  if (typeof window === 'undefined' || !domain || !shopId) return;
  window.localStorage.setItem(RESOLVED_SHOP_HOST_STORAGE_KEY, domain);
  window.localStorage.setItem(RESOLVED_SHOP_ID_STORAGE_KEY, shopId);
  window.localStorage.setItem(RESOLVED_SHOP_NAME_STORAGE_KEY, shopName || DEFAULT_SHOP_NAME);
  if (shopImage) {
    window.localStorage.setItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY, shopImage);
  } else {
    window.localStorage.removeItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY);
  }
  const images = normalizeBannerImages(bannerImages);
  const enabled = images.length > 0 && bannerEnabled !== false;
  window.localStorage.setItem(RESOLVED_SHOP_BANNER_ENABLED_KEY, enabled ? 'true' : 'false');
  if (images.length > 0) {
    window.localStorage.setItem(RESOLVED_SHOP_BANNER_IMAGES_KEY, JSON.stringify(images));
  } else {
    window.localStorage.removeItem(RESOLVED_SHOP_BANNER_IMAGES_KEY);
  }
  window.localStorage.setItem(RESOLVED_SHOP_BANNER_PARSE_VERSION_KEY, CURRENT_BANNER_PARSE_VERSION);
  if (seo && typeof seo === 'object') {
    try {
      window.localStorage.setItem(RESOLVED_SHOP_SEO_STORAGE_KEY, JSON.stringify(seo));
    } catch {
      window.localStorage.removeItem(RESOLVED_SHOP_SEO_STORAGE_KEY);
    }
  } else {
    window.localStorage.removeItem(RESOLVED_SHOP_SEO_STORAGE_KEY);
  }
}

function isLocalDevHostname(hostname) {
  const h = String(hostname || '').toLowerCase().trim();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

/** True when local dev should skip upstream resolve-by-domain (localhost). */
export function shouldSkipLocalDevTenantFetch(hostname) {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.NEXT_PUBLIC_RESOLVE_SHOP_BY_DOMAIN === 'true') return false;
  return isLocalDevHostname(hostname);
}

function devBrandingFallback() {
  return {
    shopId: envShopId(),
    shopName: envShopName() || DEFAULT_SHOP_NAME,
    shopImage: envShopImage(),
    bannerEnabled: false,
    bannerImages: [],
    seo: null,
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
    return {
      shopId: '',
      shopName: '',
      shopImage: null,
      bannerEnabled: false,
      bannerImages: [],
      seo: null,
      notFound: true,
    };
  }

  try {
    const url = new URL(resolverUrl);
    url.searchParams.set('domain', domain);

    const requestUrl = url.toString();
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      logShopDomainResolverResponse({
        domain,
        url: requestUrl,
        status: response.status,
        payload: null,
        normalized: null,
      });
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        seo: null,
        notFound: true,
      };
    }
    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      logShopDomainResolverResponse({
        domain,
        url: requestUrl,
        status: response.status,
        payload,
        normalized: null,
      });
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        seo: null,
        notFound: false,
      };
    }

    const payload = await response.json();
    const normalized = normalizeShopResolvePayload(payload);
    logShopDomainResolverResponse({
      domain,
      url: requestUrl,
      status: response.status,
      payload,
      normalized,
    });
    if (!normalized.shopId) {
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        seo: null,
        notFound: true,
      };
    }
    return {
      shopId: normalized.shopId,
      shopName: normalized.shopName || DEFAULT_SHOP_NAME,
      shopImage: normalized.shopImage,
      bannerEnabled: normalized.bannerEnabled,
      bannerImages: normalized.bannerImages,
      seo: normalized.seo,
      notFound: false,
    };
  } catch (err) {
    logShopDomainResolverResponse({
      domain,
      url: resolverUrl ? `${resolverUrl}?domain=${encodeURIComponent(domain)}` : '',
      status: null,
      payload: null,
      normalized: null,
      error: err,
    });
    return {
      shopId: '',
      shopName: '',
      shopImage: null,
      bannerEnabled: false,
      bannerImages: [],
      seo: null,
      notFound: false,
    };
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
      bannerEnabled: false,
      bannerImages: [],
      seo: null,
      fromCache: false,
      notFound: false,
    };
  }

  const resolveByDomainInDev =
    process.env.NEXT_PUBLIC_RESOLVE_SHOP_BY_DOMAIN === 'true';

  if (process.env.NODE_ENV !== 'production' && !resolveByDomainInDev) {
    const domain = String(window.location.hostname || '').toLowerCase().trim();
    if (isLocalDevHostname(domain)) {
      return devBrandingFallback();
    }
    const envId = envShopId();
    if (envId) {
      const cached = readCachedBranding(domain);
      if (
        cached &&
        cached.shopId === envId &&
        cached.shopImage &&
        cached.bannerImages?.length > 0
      ) {
        return { ...cached, fromCache: true, notFound: false };
      }
      try {
        const resolverUrl = getDefaultTenantResolverUrl();
        if (resolverUrl && domain) {
          const url = new URL(resolverUrl);
          url.searchParams.set('domain', domain);
          const requestUrl = url.toString();
          const res = await fetch(requestUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          let payload = null;
          if (res.ok) {
            payload = await res.json();
          } else {
            try {
              payload = await res.json();
            } catch {
              payload = null;
            }
          }
          const normalized = payload ? normalizeShopResolvePayload(payload) : null;
          logShopDomainResolverResponse({
            domain,
            url: requestUrl,
            status: res.status,
            payload,
            normalized,
          });
          if (res.ok && normalized?.shopId) {
            persistResolvedShop(domain, normalized);
            return { ...normalized, fromCache: false, notFound: false };
          }
        }
      } catch {
        // Fall through to env fallback
      }
    }
    return devBrandingFallback();
  }

  const domain = String(window.location.hostname || '').toLowerCase().trim();
  if (!domain) {
    return {
      shopId: '',
      shopName: DEFAULT_SHOP_NAME,
      shopImage: null,
      bannerEnabled: false,
      bannerImages: [],
      seo: null,
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
      bannerEnabled: false,
      bannerImages: [],
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
    bannerEnabled: false,
    bannerImages: [],
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
