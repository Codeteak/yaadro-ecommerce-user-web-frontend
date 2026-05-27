import { clearAllClientSessionData } from './clearClientSession';
import { setPostLoginRedirect, sanitizeInternalPath } from './authSession';
import { isUnauthorizedError } from './authErrors';

export const AUTH_SESSION_EXPIRED_EVENT = 'yaadro:auth-session-expired';

let expiryHandling = false;

function isLoginOrAuthRoute(pathname) {
  const p = pathname || '';
  return p === '/login' || p.startsWith('/auth/');
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
    normalized.startsWith('auth/oauth')
  );
}

/**
 * True when the API error indicates an invalid/expired session (401/403 or message).
 */
export function isAuthSessionExpiryError(error, apiPath) {
  if (apiPath && shouldSkipSessionExpiryForApiPath(apiPath)) return false;
  return isUnauthorizedError(error);
}

/**
 * Clear all client session data, notify AuthContext, and redirect to `/login`.
 * Safe to call multiple times (deduped).
 */
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

export function expireAuthSessionAndRedirect(options = {}) {
  if (typeof window === 'undefined') return;

  const { redirect = true, saveReturnPath = true, hadSession } = options;
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
