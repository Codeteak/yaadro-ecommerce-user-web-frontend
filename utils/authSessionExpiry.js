import { clearAllClientSessionData } from './clearClientSession';

export const AUTH_SESSION_EXPIRED_EVENT = 'yaadro:auth-session-expired';

let expiryHandling = false;

/** Paths where a failed request should show an in-page error, not force navigation away. */
const SOFT_SESSION_PATHS = ['/checkout', '/order-success'];

/**
 * Account / order surfaces that require a session.
 * Guests and expired sessions leave these for the public home — not `/login`.
 */
const PROTECTED_CUSTOMER_PATHS = [
  '/profile',
  '/orders',
  '/addresses',
  '/add/address',
  '/order',
];

const BUSINESS_ERROR_CODES = new Set([
  'EMPTY_CART_WITH_COUPON',
  'COUPON_NOT_FOUND',
  'COUPON_NOT_APPLICABLE',
  'COUPON_NO_CART_BENEFIT',
  'COUPON_EXHAUSTED',
  'MIN_SUBTOTAL_NOT_MET',
  'FIRST_ORDER_ONLY_NOT_MET',
  'NEW_CUSTOMER_ONLY_NOT_MET',
  'CART_EMPTY',
  'CART_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'PRICE_CHANGED',
  'ADDRESS_REQUIRED',
  'ADDRESS_COORDINATES_REQUIRED',
  'ADDRESS_NOT_SERVICEABLE',
]);

function isLoginOrAuthRoute(pathname) {
  const p = pathname || '';
  return p === '/login' || p.startsWith('/auth/');
}

function pathMatchesPrefix(pathname, prefix) {
  const p = pathname || '';
  return p === prefix || p.startsWith(`${prefix}/`) || p.startsWith(`${prefix}?`);
}

/** True when the current URL is an account/order page that needs auth. */
export function isProtectedCustomerPath(pathname) {
  const p = pathname || '';
  if (!p || p === '/') return false;
  if (SOFT_SESSION_PATHS.some((prefix) => pathMatchesPrefix(p, prefix))) return false;
  return PROTECTED_CUSTOMER_PATHS.some((prefix) => pathMatchesPrefix(p, prefix));
}

function extractApiErrorCode(json) {
  const code = json?.error?.code ?? json?.code;
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function isKnownBusinessErrorCode(code) {
  if (!code) return false;
  if (BUSINESS_ERROR_CODES.has(code)) return true;
  return (
    code.startsWith('COUPON_') ||
    code.startsWith('CART_') ||
    code.startsWith('ADDRESS_') ||
    code.startsWith('PRODUCT_')
  );
}

/** API paths where 401 is expected (wrong OTP, etc.) — do not force global logout. */
export function shouldSkipSessionExpiryForApiPath(path) {
  const normalized = String(path || '').replace(/^\//, '').toLowerCase();
  return (
    normalized.startsWith('auth/login') ||
    normalized.startsWith('auth/otp') ||
    normalized.startsWith('auth/email-otp') ||
    normalized.startsWith('auth/register') ||
    normalized.startsWith('auth/verify') ||
    normalized.startsWith('auth/refresh') ||
    normalized.startsWith('auth/logout') ||
    normalized.startsWith('auth/oauth')
  );
}

/**
 * Whether session-end handling should navigate away from the current page.
 * Public browse + soft checkout stay; protected account pages leave via React
 * (`useRequireAuth` → home). Hard `/login` redirects are never used here.
 */
export function shouldRedirectAfterSessionExpiry() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname || '';
  if (isLoginOrAuthRoute(p)) return false;
  if (SOFT_SESSION_PATHS.some((prefix) => pathMatchesPrefix(p, prefix))) return false;
  // Protected pages: do not hard-navigate here — AuthContext + useRequireAuth → `/`.
  // Public pages: clear auth only; keep browsing.
  return false;
}

/**
 * Whether a failed API response should clear the client session.
 * Checkout/storefront errors must not log the user out — show the error instead.
 */
export function shouldInvalidateSessionOnApiError({
  status,
  path,
  json,
  refreshAttempted = false,
  refreshSucceeded = false,
} = {}) {
  if (shouldSkipSessionExpiryForApiPath(path)) return false;
  if (status === 403) return false;
  if (status !== 401) return false;

  const code = extractApiErrorCode(json);
  if (isKnownBusinessErrorCode(code)) return false;

  if (refreshAttempted && refreshSucceeded) return false;
  return true;
}

/**
 * Clear session storage and notify React auth state.
 * Does not send the customer to `/login` — public shopping continues;
 * protected routes navigate home via `useRequireAuth`.
 */
export function notifyAuthSessionEnded(_options = {}) {
  if (typeof window === 'undefined') return;

  if (expiryHandling) return;
  expiryHandling = true;

  try {
    clearAllClientSessionData();
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
  } finally {
    expiryHandling = false;
  }
}

/** @deprecated Prefer notifyAuthSessionEnded — kept for AuthContext call sites. */
export function expireAuthSessionAndRedirect(options = {}) {
  notifyAuthSessionEnded(options);
}
