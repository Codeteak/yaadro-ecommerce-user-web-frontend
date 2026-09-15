/**
 * Client-side auth session window — aligned with ecom-client-backend defaults:
 * - Access JWT: ~15m (`JWT_ACCESS_EXPIRES_IN`) — refreshed via JWT `exp` in AuthContext / apiClient
 * - Refresh JWT: ~30d (`JWT_REFRESH_EXPIRES_IN`) — source of truth for "stay logged in"
 *
 * On each successful refresh rotation the backend issues a new refresh JWT (~30d from now).
 * `syncSessionExpiryFromRefreshToken` slides the client clock to that JWT `exp`.
 *
 * Override fallback only (when refresh JWT has no usable `exp`) with
 * `NEXT_PUBLIC_AUTH_REFRESH_TOKEN_DAYS` (or legacy `NEXT_PUBLIC_AUTH_SESSION_DAYS`).
 * Keep that value equal to the API's `JWT_REFRESH_EXPIRES_IN` days.
 */

import { getJwtExpiresAtMs, isLikelyRefreshTokenJwt } from './jwtExp.js';

export const AUTH_SESSION_EXPIRES_KEY = 'yaadro_auth_session_expires_at';

export const POST_LOGIN_REDIRECT_KEY = 'yaadro_post_login_redirect';

/** Matches backend default `JWT_REFRESH_EXPIRES_IN=30d`. */
export const REFRESH_TOKEN_LIFETIME_DAYS = 30;

/**
 * Fallback only when JWT `exp` is missing — access tokens are typically 15m.
 * Prefer scheduling from JWT `exp` in AuthContext.
 */
export const ACCESS_TOKEN_LIFETIME_DAYS = 15 / (24 * 60);

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

/** Max client session length from login when refresh JWT has no usable `exp`. */
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
 * Prefer the refresh JWT `exp` (backend is authoritative). Fall back to configured days
 * only when the token is missing, not decodeable, or looks like an access JWT.
 *
 * @param {{ refreshToken?: string|null, loginAtMs?: number }} params
 */
export function computeSessionExpiresAtMs({ refreshToken, loginAtMs = Date.now() } = {}) {
  const wallClockExp = loginAtMs + REFRESH_SESSION_DURATION_MS;
  if (!refreshToken) return wallClockExp;
  const jwtExp = getJwtExpiresAtMs(refreshToken);
  if (jwtExp == null) return wallClockExp;
  if (isLikelyRefreshTokenJwt(refreshToken)) return jwtExp;
  return wallClockExp;
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
 * Start or reset the client session window (call on login / full re-auth only).
 */
export function establishClientSession({ refreshToken, loginAtMs = Date.now() } = {}) {
  if (typeof window === 'undefined') return;
  const exp = computeSessionExpiresAtMs({ refreshToken, loginAtMs });
  window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(exp));
}

/**
 * Update session deadline from the current refresh JWT (after rotation).
 * Sets the clock to that JWT's `exp` — sliding window matches backend rotation.
 */
export function syncSessionExpiryFromRefreshToken(refreshToken) {
  if (typeof window === 'undefined' || !refreshToken) return;
  const computed = computeSessionExpiresAtMs({ refreshToken, loginAtMs: Date.now() });
  window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(computed));
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
 * Legacy / misaligned sessions: derive deadline from refresh JWT or 30-day default.
 * Also corrects old clients that stored a 50-day clock while the refresh JWT is 30d.
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
  if (refreshToken) {
    const corrected = computeSessionExpiresAtMs({ refreshToken });
    if (stored == null || Math.abs(stored - corrected) > 60 * 1000) {
      window.localStorage.setItem(AUTH_SESSION_EXPIRES_KEY, String(corrected));
    }
    return;
  }

  if (stored == null) {
    establishClientSession({ refreshToken: undefined });
  }
}
