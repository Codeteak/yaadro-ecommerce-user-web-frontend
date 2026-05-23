/**
 * Client-side auth session window — aligned with backend token lifetimes:
 * - Refresh token: 50 days (max logged-in window)
 * - Access token: 7 days (refreshed proactively via JWT `exp` in AuthContext)
 *
 * The stored expiry is the refresh-token deadline (JWT `exp` when present, else
 * login time + 50 days). Access-token refresh and profile fetches do NOT extend it.
 */

import { getJwtExpiresAtMs } from './jwtExp';

export const AUTH_SESSION_EXPIRES_KEY = 'yaadro_auth_session_expires_at';

export const POST_LOGIN_REDIRECT_KEY = 'yaadro_post_login_redirect';

/** Backend refresh-token lifetime (days). */
export const REFRESH_TOKEN_LIFETIME_DAYS = 50;

/** Backend access-token lifetime (days) — used for refresh scheduling fallbacks only. */
export const ACCESS_TOKEN_LIFETIME_DAYS = 7;

const parsedRefreshDays =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_REFRESH_TOKEN_DAYS
    ? parseInt(process.env.NEXT_PUBLIC_AUTH_REFRESH_TOKEN_DAYS, 10)
    : process.env.NEXT_PUBLIC_AUTH_SESSION_DAYS
      ? parseInt(process.env.NEXT_PUBLIC_AUTH_SESSION_DAYS, 10)
      : NaN;

const refreshTokenDays =
  Number.isFinite(parsedRefreshDays) && parsedRefreshDays > 0
    ? Math.min(parsedRefreshDays, 730)
    : REFRESH_TOKEN_LIFETIME_DAYS;

/** Max client session length from login when refresh JWT has no `exp`. */
export const REFRESH_SESSION_DURATION_MS = refreshTokenDays * 24 * 60 * 60 * 1000;

/** @deprecated Use REFRESH_SESSION_DURATION_MS */
export const SESSION_DURATION_MS = REFRESH_SESSION_DURATION_MS;

/** Safe in-app path only (relative, no open redirects). */
export function sanitizeInternalPath(path) {
  if (path == null || typeof path !== 'string') return null;
  const t = path.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  return t;
}

export function setPostLoginRedirect(path) {
  if (typeof window === 'undefined') return;
  const safe = sanitizeInternalPath(path);
  if (safe) window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, safe);
}

export function clearPostLoginRedirect() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

export function getPostLoginRedirect() {
  if (typeof window === 'undefined') return null;
  return sanitizeInternalPath(window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
}

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

/**
 * Compute refresh-session expiry (ms since epoch).
 * Uses the later of JWT `exp` and configured refresh lifetime so a short JWT `exp`
 * (e.g. access token mistakenly stored as refresh) does not force logout after one day
 * while the product policy is 50 days — backend refresh API remains authoritative.
 *
 * @param {{ refreshToken?: string|null, loginAtMs?: number }} params
 */
export function computeSessionExpiresAtMs({ refreshToken, loginAtMs = Date.now() } = {}) {
  const wallClockExp = loginAtMs + REFRESH_SESSION_DURATION_MS;
  const jwtExp = refreshToken ? getJwtExpiresAtMs(refreshToken) : null;
  if (jwtExp == null) return wallClockExp;
  return Math.max(jwtExp, wallClockExp);
}

/**
 * Stored credentials that may still represent a logged-in user.
 */
export function hasStoredAuthCredentials() {
  if (typeof window === 'undefined') return false;
  const refresh = window.localStorage.getItem('refreshToken');
  const access =
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('authToken') ||
    window.localStorage.getItem('accessToken');
  return !!(refresh || access);
}

/**
 * Start or reset the client session window (call on login / refresh-token rotation only).
 */
export function establishClientSession({ refreshToken, loginAtMs = Date.now() } = {}) {
  if (typeof window === 'undefined') return;
  const exp = computeSessionExpiresAtMs({ refreshToken, loginAtMs });
  window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(exp));
}

/**
 * Update session deadline from a new refresh token JWT (after token rotation).
 * Does not extend the window beyond the new JWT `exp`.
 */
export function syncSessionExpiryFromRefreshToken(refreshToken) {
  if (typeof window === 'undefined' || !refreshToken) return;
  const computed = computeSessionExpiresAtMs({ refreshToken, loginAtMs: Date.now() });
  const existing = readSessionExpiresAtMs();
  const next = existing != null ? Math.max(existing, computed) : computed;
  window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(next));
}

/** @deprecated Prefer establishClientSession — kept for existing imports. */
export function writeSessionExpiresAtFromLogin(loginAtMs = Date.now()) {
  if (typeof window === 'undefined') return;
  const refreshToken = window.localStorage.getItem('refreshToken');
  establishClientSession({ refreshToken, loginAtMs });
}

export function clearSessionExpiresAt() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_EXPIRES_KEY);
}

/** True when the refresh-token session window has ended — client should clear auth. */
export function isClientSessionExpired() {
  const exp = readSessionExpiresAtMs();
  if (exp == null) return false;
  return Date.now() >= exp;
}

/**
 * Session clock expired but we may still recover via refresh token — try refresh before logout.
 */
export function shouldAttemptSessionRecovery() {
  if (typeof window === 'undefined') return false;
  if (!isClientSessionExpired()) return false;
  return !!window.localStorage.getItem('refreshToken');
}

/**
 * Legacy sessions without expiry: derive deadline from refresh JWT or 50-day default.
 */
export function ensureSessionExpiryForExistingLogin() {
  if (typeof window === 'undefined') return;
  const refreshToken = window.localStorage.getItem('refreshToken');
  const access =
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('authToken') ||
    window.localStorage.getItem('accessToken');
  if (!refreshToken && !access) return;

  const stored = readSessionExpiresAtMs();
  if (stored == null) {
    establishClientSession({ refreshToken: refreshToken || undefined });
    return;
  }

  // Correct sessions saved with a short JWT `exp` before policy-aware expiry.
  if (refreshToken) {
    const corrected = computeSessionExpiresAtMs({ refreshToken });
    if (corrected > stored) {
      window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(corrected));
    }
  }
}
