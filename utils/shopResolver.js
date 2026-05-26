/**
 * Resolve shop tenant (id, name, logo) for the current domain via GET /shops/resolve-by-domain.
 * Cached in localStorage per hostname. Used for branding, splash, and x-shop-id flows.
 */

export const RESOLVED_SHOP_ID_STORAGE_KEY = 'yaadro_resolved_shop_id';
export const RESOLVED_SHOP_HOST_STORAGE_KEY = 'yaadro_resolved_shop_host';
export const RESOLVED_SHOP_NAME_STORAGE_KEY = 'yaadro_resolved_shop_name';
export const RESOLVED_SHOP_IMAGE_STORAGE_KEY = 'yaadro_resolved_shop_image';
export const RESOLVED_SHOP_BANNER_ENABLED_KEY = 'yaadro_resolved_shop_banner_enabled';
export const RESOLVED_SHOP_BANNER_IMAGES_KEY = 'yaadro_resolved_shop_banner_images';

const DEFAULT_SHOP_NAME = 'Yaadro';

/** @param {unknown} raw */
function normalizeBannerImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const url = item.url ?? item.image ?? item.src;
        if (url != null && String(url).trim()) return String(url).trim();
      }
      return '';
    })
    .filter(Boolean);
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
    };
  }
  const root = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const shopId = String(
    root.shopId ?? root.shop_id ?? root.tenantId ?? root.tenant_id ?? ''
  ).trim();
  const shopName = String(root.shopName ?? root.shop_name ?? '').trim();
  const shopImageRaw = root.shopImage ?? root.shop_image ?? null;
  const shopImage =
    shopImageRaw != null && String(shopImageRaw).trim() ? String(shopImageRaw).trim() : null;
  const bannerImages = normalizeBannerImages(root.banner_images ?? root.bannerImages);
  const bannerEnabled =
    normalizeBannerEnabled(root.banner_enabled ?? root.bannerEnabled) && bannerImages.length > 0;
  return { shopId, shopName, shopImage, bannerEnabled, bannerImages };
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
  const shopName = window.localStorage.getItem(RESOLVED_SHOP_NAME_STORAGE_KEY) || '';
  const shopImage = window.localStorage.getItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY) || '';
  const bannerEnabledRaw = window.localStorage.getItem(RESOLVED_SHOP_BANNER_ENABLED_KEY);
  let bannerImages = [];
  try {
    const raw = window.localStorage.getItem(RESOLVED_SHOP_BANNER_IMAGES_KEY);
    if (raw) bannerImages = normalizeBannerImages(JSON.parse(raw));
  } catch {
    bannerImages = [];
  }
  const bannerEnabled =
    bannerEnabledRaw === 'true' && Array.isArray(bannerImages) && bannerImages.length > 0;
  return {
    shopId,
    shopName: shopName || DEFAULT_SHOP_NAME,
    shopImage: shopImage || null,
    bannerEnabled,
    bannerImages,
  };
}

export function persistResolvedShop(
  domain,
  { shopId, shopName, shopImage, bannerEnabled = false, bannerImages = [] }
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
  const enabled = Boolean(bannerEnabled) && images.length > 0;
  window.localStorage.setItem(RESOLVED_SHOP_BANNER_ENABLED_KEY, enabled ? 'true' : 'false');
  if (images.length > 0) {
    window.localStorage.setItem(RESOLVED_SHOP_BANNER_IMAGES_KEY, JSON.stringify(images));
  } else {
    window.localStorage.removeItem(RESOLVED_SHOP_BANNER_IMAGES_KEY);
  }
}

function devBrandingFallback() {
  return {
    shopId: envShopId(),
    shopName: envShopName() || DEFAULT_SHOP_NAME,
    shopImage: envShopImage(),
    bannerEnabled: false,
    bannerImages: [],
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
      notFound: true,
    };
  }

  try {
    const url = new URL(resolverUrl);
    url.searchParams.set('domain', domain);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        notFound: true,
      };
    }
    if (!response.ok) {
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        notFound: false,
      };
    }

    const payload = await response.json();
    const normalized = normalizeShopResolvePayload(payload);
    if (!normalized.shopId) {
      return {
        shopId: '',
        shopName: '',
        shopImage: null,
        bannerEnabled: false,
        bannerImages: [],
        notFound: true,
      };
    }
    return {
      shopId: normalized.shopId,
      shopName: normalized.shopName || DEFAULT_SHOP_NAME,
      shopImage: normalized.shopImage,
      bannerEnabled: normalized.bannerEnabled,
      bannerImages: normalized.bannerImages,
      notFound: false,
    };
  } catch {
    return {
      shopId: '',
      shopName: '',
      shopImage: null,
      bannerEnabled: false,
      bannerImages: [],
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
      fromCache: false,
      notFound: false,
    };
  }

  const resolveByDomainInDev =
    process.env.NEXT_PUBLIC_RESOLVE_SHOP_BY_DOMAIN === 'true';

  if (process.env.NODE_ENV !== 'production' && !resolveByDomainInDev) {
    const envId = envShopId();
    if (envId) {
      const cached = readCachedBranding(String(window.location.hostname || '').toLowerCase().trim());
      if (cached && cached.shopId === envId && cached.shopImage) {
        return { ...cached, fromCache: true, notFound: false };
      }
      try {
        const domain = String(window.location.hostname || '').toLowerCase().trim();
        const resolverUrl = getDefaultTenantResolverUrl();
        if (resolverUrl && domain) {
          const url = new URL(resolverUrl);
          url.searchParams.set('domain', domain);
          const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const payload = await res.json();
            const normalized = normalizeShopResolvePayload(payload);
            if (normalized.shopId) {
              persistResolvedShop(domain, normalized);
              return { ...normalized, fromCache: false, notFound: false };
            }
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
