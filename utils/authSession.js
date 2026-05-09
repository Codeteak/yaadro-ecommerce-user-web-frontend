/**
 * Client-side session window after OTP (and other) logins.
 * Stored auth is cleared after this duration unless the session is touched again
 * (login, token refresh, or successful profile fetch).
 *
 * Override with NEXT_PUBLIC_AUTH_SESSION_DAYS (1–730); default 365.
 */

export const AUTH_SESSION_EXPIRES_KEY = 'yaadro_auth_session_expires_at';


export const POST_LOGIN_REDIRECT_KEY = 'yaadro_post_login_redirect';

/** Safe in-app path only (relative, no open redirects). */
export function sanitizeInternalPath(path) {
  if (path == null || typeof path !== 'string') return null;
  const t = path.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  return t;
}

const parsedSessionDays =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_SESSION_DAYS
    ? parseInt(process.env.NEXT_PUBLIC_AUTH_SESSION_DAYS, 10)
    : NaN;
const sessionDays =
  Number.isFinite(parsedSessionDays) && parsedSessionDays > 0
    ? Math.min(parsedSessionDays, 730)
    : 365;

/** Wall-clock session length in milliseconds (default one year). */
export const SESSION_DURATION_MS = sessionDays * 24 * 60 * 60 * 1000;

export function setPostLoginRedirect(path) {
  if (typeof window === 'undefined') return;
  const safe = sanitizeInternalPath(path);
  if (safe) window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, safe);
}

export function clearPostLoginRedirect() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

/** Peek stored return path without clearing (e.g. logged-in user hits `/login`). */
export function getPostLoginRedirect() {
  if (typeof window === 'undefined') return null;
  return sanitizeInternalPath(window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
}

/** Read and clear — use once after successful login. */
export function takePostLoginRedirect() {
  if (typeof window === 'undefined') return null;
  const next = getPostLoginRedirect();
  clearPostLoginRedirect();
  return next;
}

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

/** If true, client should clear auth (session window ended). */
export function isClientSessionExpired() {
  const exp = readSessionExpiresAtMs();
  if (exp == null) return false;
  return Date.now() > exp;
}

/**
 * Users who already had a token before session expiry was tracked: start one window once.
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
