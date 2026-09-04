/**
 * Persist checkout UI state (coupon, notes, address) while the user leaves for /add/address.
 * Cleared after a successful order — not on navigation away from checkout.
 */

export const CHECKOUT_DRAFT_KEY = 'yaadro_checkout_draft_v1';

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

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function readSelectedCouponCode() {
  return normalizeCouponCode(readCheckoutDraft()?.couponCode);
}

export function writeSelectedCouponCode(code) {
  writeCheckoutDraft({ couponCode: normalizeCouponCode(code) });
}
