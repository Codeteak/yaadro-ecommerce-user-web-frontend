/**
 * Read JWT `exp` (seconds since epoch) without verifying the signature.
 * @param {string} jwt
 * @returns {number|null} expiry in milliseconds, or null if missing/invalid
 */
export function getJwtExpiresAtMs(jwt) {
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
    if (payload == null || typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** Milliseconds until we should refresh (before `exp`, with bounds). */
export function getMsUntilAccessTokenRefresh(accessToken, opts = {}) {
  const skewMs = opts.skewMs ?? 90 * 1000;
  const fallbackMs = opts.fallbackMs ?? 15 * 60 * 1000;
  const minDelayMs = opts.minDelayMs ?? 5 * 1000;
  const maxDelayMs = opts.maxDelayMs ?? 24 * 60 * 60 * 1000;
  const expMs = getJwtExpiresAtMs(accessToken);
  if (expMs == null) return fallbackMs;
  const until = expMs - Date.now() - skewMs;
  if (until <= 0) return Math.max(minDelayMs, 3 * 1000);
  return Math.min(Math.max(until, minDelayMs), maxDelayMs);
}
