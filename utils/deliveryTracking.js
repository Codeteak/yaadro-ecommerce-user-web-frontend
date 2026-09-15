/**
 * Helpers for Yaadro DMS delivery tracking links on the storefront.
 * Tracking is shown in-app at `/order/track?id=…` (iframe), not as an external leave.
 */

export function isHttpTrackingUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

/** In-app route that wraps the DMS tracking page. */
export function inAppTrackingHref(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return "/orders";
  return `/order/track?id=${encodeURIComponent(id)}`;
}

function storageKey(orderId) {
  return `yaadro-tracking-opened:${String(orderId || "").trim()}`;
}

export function hasOpenedTrackingThisSession(orderId) {
  if (!orderId || typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(storageKey(orderId)) === "1";
  } catch {
    return false;
  }
}

export function markTrackingOpenedThisSession(orderId) {
  if (!orderId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(orderId), "1");
  } catch {
    /* private mode / blocked storage */
  }
}
