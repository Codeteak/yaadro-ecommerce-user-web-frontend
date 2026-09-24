/**
 * Persist checkout UI state (coupon, notes, address) while the user leaves for /add/address.
 * Cleared after a successful order — not on navigation away from checkout.
 */

export const CHECKOUT_DRAFT_KEY = 'yaadro_checkout_draft_v1';

/**
 * After a successful place-order, Order Detail Back (and browser Back) should go Home
 * instead of walking through cart/checkout/order-success history.
 */
export const POST_ORDER_BACK_HOME_KEY = 'yaadro_post_order_back_home';

export function readCheckoutDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    const prev = readCheckoutDraft() || {};
    const next = {
      ...prev,
      ...(draft && typeof draft === 'object' ? draft : {}),
      updatedAt: Date.now(),
    };
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function clearCheckoutDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Mark that the next Order Detail view should treat Back as Home (post-checkout). */
export function markPostOrderBackToHome(orderId) {
  if (typeof window === 'undefined') return;
  try {
    const id = String(orderId || '').trim();
    window.sessionStorage.setItem(POST_ORDER_BACK_HOME_KEY, id || '1');
  } catch {
    /* ignore */
  }
}

export function clearPostOrderBackToHome() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(POST_ORDER_BACK_HOME_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * True when Order Detail was reached from a successful checkout for this order
 * (or any order if the stored value is the generic sentinel).
 */
export function shouldPostOrderBackToHome(orderId) {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.sessionStorage.getItem(POST_ORDER_BACK_HOME_KEY);
    if (!stored) return false;
    const id = String(orderId || '').trim();
    if (!id) return true;
    return stored === id || stored === '1';
  } catch {
    return false;
  }
}

/** Canonical href for the existing order-detail route (`/order?id=`). */
export function orderDetailHref(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return '/orders';
  return `/order?id=${encodeURIComponent(id)}`;
}

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function normalizeCouponCodes(codes) {
  const list = Array.isArray(codes) ? codes : codes ? [codes] : [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const n = normalizeCouponCode(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function readSelectedCouponCode() {
  return normalizeCouponCode(readCheckoutDraft()?.couponCode);
}

export function writeSelectedCouponCode(code) {
  const normalized = normalizeCouponCode(code);
  writeCheckoutDraft({
    couponCode: normalized,
    couponCodes: normalized ? [normalized] : [],
  });
}

export function readSelectedCouponCodes() {
  const draft = readCheckoutDraft();
  const fromArray = normalizeCouponCodes(draft?.couponCodes);
  if (fromArray.length) return fromArray;
  const single = normalizeCouponCode(draft?.couponCode);
  return single ? [single] : [];
}

export function writeSelectedCouponCodes(codes) {
  const normalized = normalizeCouponCodes(codes);
  writeCheckoutDraft({
    couponCode: normalized[0] || '',
    couponCodes: normalized,
  });
}
