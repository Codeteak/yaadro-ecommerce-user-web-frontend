/**
 * Read JWT payload without verifying the signature (client scheduling / session clock only).
 * @param {string} jwt
 * @returns {Record<string, unknown>|null}
 */
export function getJwtPayload(jwt) {
  if (jwt == null || typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json =
      typeof atob !== 'undefined'
        ? atob(b64)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(b64, 'base64').toString('utf8')
          : null;
    if (json == null) return null;
    const payload = JSON.parse(json);
    return payload != null && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Read JWT `exp` (seconds since epoch) without verifying the signature.
 * @param {string} jwt
 * @returns {number|null} expiry in milliseconds, or null if missing/invalid
 */
export function getJwtExpiresAtMs(jwt) {
  const payload = getJwtPayload(jwt);
  if (payload == null || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}

/**
 * True when the token looks like a backend refresh JWT (`typ: "refresh"` or long-lived `exp`).
 * Used so a short-lived access JWT stored under `refreshToken` does not drive the session clock.
 */
export function isLikelyRefreshTokenJwt(jwt) {
  const payload = getJwtPayload(jwt);
  if (!payload) return false;
  if (payload.typ === 'refresh') return true;
  const expMs = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  if (expMs == null) return false;
  return expMs - Date.now() > 12 * 60 * 60 * 1000;
}

/** Fallback when JWT has no `exp` — matches backend default access TTL (~15m). */
export const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

/** Milliseconds until proactive access-token refresh (before JWT `exp`). */
export function getMsUntilAccessTokenRefresh(accessToken, opts = {}) {
  const skewMs = opts.skewMs ?? 60 * 1000;
  const fallbackMs = opts.fallbackMs ?? ACCESS_TOKEN_LIFETIME_MS - skewMs;
  const minDelayMs = opts.minDelayMs ?? 5 * 1000;
  // Cap matches default access TTL; longer access JWTs still refresh within the first 15m window.
  const maxDelayMs = opts.maxDelayMs ?? ACCESS_TOKEN_LIFETIME_MS;
  const expMs = getJwtExpiresAtMs(accessToken);
  if (expMs == null) return fallbackMs;
  const until = expMs - Date.now() - skewMs;
  if (until <= 0) return Math.max(minDelayMs, 3 * 1000);
  return Math.min(Math.max(until, minDelayMs), maxDelayMs);
}
