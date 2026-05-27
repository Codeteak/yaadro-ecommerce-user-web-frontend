import { clearSessionExpiresAt, AUTH_SESSION_EXPIRES_KEY, POST_LOGIN_REDIRECT_KEY } from './authSession';

/**
 * Every localStorage key this app writes — keep in sync when adding new keys.
 * Shop-resolver keys are intentionally cleared so a fresh login re-resolves the tenant.
 */
const LOCAL_STORAGE_KEYS = [
  // Auth
  'user',
  'token',
  'authToken',
  'accessToken',
  'refreshToken',
  AUTH_SESSION_EXPIRES_KEY,

  // Cart
  'cart',
  'cartApiCache',
  'cartLastActivity',
  'savedCarts',
  'cartTemplates',

  // User data
  'wishlist',
  'addresses',
  'orders',
  'recentlyViewed',
  'activityLog',
  'privacySettings',

  // Shop / tenant
  'tenantId',
  'tenant',
  'yaadro_resolved_shop_id',
  'yaadro_resolved_shop_host',
  'yaadro_resolved_shop_name',
  'yaadro_resolved_shop_image',
  'yaadro_resolved_shop_banner_enabled',
  'yaadro_resolved_shop_banner_images',

  // Product slug cache
  'yaadro_product_slug_by_id_v1',

  // Delivery / service area
  'yaadro-delivery-check-v1',
  'yaadro-service-area-warned',
];

const SESSION_STORAGE_KEYS = [
  'yaadro-service-area-warned',
  'yaadro_checkout_draft_v1',
  POST_LOGIN_REDIRECT_KEY,
];

const LOCAL_STORAGE_PREFIXES = ['yaadro_address_edit_'];

function clearLocalStorageByPrefixes(prefixes) {
  if (typeof window === 'undefined') return;
  const toRemove = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (prefixes.some((prefix) => key.startsWith(prefix))) toRemove.push(key);
  }
  for (const key of toRemove) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Clear all client-side user session, cart, and preference data (logout / session expiry / account delete).
 */
export function clearAllClientSessionData() {
  if (typeof window === 'undefined') return;

  for (const key of LOCAL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  clearLocalStorageByPrefixes(LOCAL_STORAGE_PREFIXES);

  for (const key of SESSION_STORAGE_KEYS) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  clearSessionExpiresAt();
}
