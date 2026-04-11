/**
 * Client-side session window after OTP (and other) logins.
 * Persists for 7 days; stored auth is cleared after that.
 */

export const AUTH_SESSION_EXPIRES_KEY = 'yaadro_auth_session_expires_at';


export const POST_LOGIN_REDIRECT_KEY = 'yaadro_post_login_redirect';

export function setPostLoginRedirect(path) {
  if (typeof window === 'undefined') return;
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
    window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
  }
}

export function clearPostLoginRedirect() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

/** 7 days in milliseconds */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function readSessionExpiresAtMs() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_SESSION_EXPIRES_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function writeSessionExpiresAtFromLogin(loginAtMs = Date.now()) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(loginAtMs + SESSION_DURATION_MS));
}

export function clearSessionExpiresAt() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_EXPIRES_KEY);
}

/** If true, client should clear auth (7-day window ended). */
export function isClientSessionExpired() {
  const exp = readSessionExpiresAtMs();
  if (exp == null) return false;
  return Date.now() > exp;
}

/**
 * Users who already had a token before this feature: start a 7-day window once.
 */
export function ensureSessionExpiryForExistingLogin() {
  if (typeof window === 'undefined') return;
  if (readSessionExpiresAtMs() != null) return;
  const token =
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('authToken') ||
    window.localStorage.getItem('accessToken');
  if (!token) return;
  writeSessionExpiresAtFromLogin();
}
