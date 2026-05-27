import { clearAllClientSessionData } from './clearClientSession';
import { setPostLoginRedirect, sanitizeInternalPath } from './authSession';

export const AUTH_SESSION_EXPIRED_EVENT = 'yaadro:auth-session-expired';

let expiryHandling = false;

/** Paths where a failed request should show an in-page error, not force login redirect. */
const SOFT_SESSION_PATHS = ['/checkout', '/order-success'];

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
    normalized.startsWith('auth/register') ||
    normalized.startsWith('auth/verify') ||
    normalized.startsWith('auth/refresh') ||
    normalized.startsWith('auth/oauth') ||
    normalized.startsWith('storefront/')
  );
}

/** Avoid hard redirect during checkout / post-order so the user sees the real error first. */
export function shouldRedirectAfterSessionExpiry() {
  if (typeof window === 'undefined') return true;
  const p = window.location.pathname || '';
  if (isLoginOrAuthRoute(p)) return false;
  return !SOFT_SESSION_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
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

function hadStoredAuthSession() {
  if (typeof window === 'undefined') return false;
  return !!(
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('authToken') ||
    window.localStorage.getItem('accessToken') ||
    window.localStorage.getItem('refreshToken') ||
    window.localStorage.getItem('user')
  );
}

/**
 * Clear session storage and React auth state. Optionally redirect to `/login`.
 */
export function notifyAuthSessionEnded(options = {}) {
  if (typeof window === 'undefined') return;

  const { redirect = shouldRedirectAfterSessionExpiry(), saveReturnPath = true, hadSession } =
    options;
  const pathname = window.location.pathname || '/';
  const onAuthPage = isLoginOrAuthRoute(pathname);
  const wasLoggedIn = hadSession ?? hadStoredAuthSession();

  if (expiryHandling) return;
  expiryHandling = true;

  try {
    clearAllClientSessionData();
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));

    if (redirect && wasLoggedIn && !onAuthPage) {
      if (saveReturnPath) {
        const search = window.location.search || '';
        const returnPath = sanitizeInternalPath(`${pathname}${search}`);
        if (returnPath) setPostLoginRedirect(returnPath);
      }
      window.location.assign('/login');
      return;
    }
  } finally {
    if (!redirect || onAuthPage) {
      expiryHandling = false;
    }
  }
}

/** @deprecated Prefer notifyAuthSessionEnded — kept for AuthContext call sites. */
export function expireAuthSessionAndRedirect(options = {}) {
  notifyAuthSessionEnded(options);
}
