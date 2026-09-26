import { normalizePhoneForApi } from './otpVerifyPayload.js';

/** localStorage key prefix — phone-scoped pending display name until address save. */
export const PENDING_CUSTOMER_NAME_PREFIX = 'yaadro_pending_customer_name_v1:';

export const PENDING_CUSTOMER_NAME_MAX_LEN = 120;

function storageKey(phone) {
  const ten = normalizePhoneForApi(phone);
  if (!ten) return '';
  return `${PENDING_CUSTOMER_NAME_PREFIX}${ten}`;
}

/**
 * Normalize a customer display name for local pending storage.
 * @param {unknown} name
 * @returns {string}
 */
export function normalizePendingCustomerName(name) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.slice(0, PENDING_CUSTOMER_NAME_MAX_LEN);
}

/**
 * @param {unknown} phone
 * @returns {string}
 */
export function getPendingCustomerName(phone) {
  if (typeof window === 'undefined') return '';
  const key = storageKey(phone);
  if (!key) return '';
  try {
    return normalizePendingCustomerName(window.localStorage.getItem(key));
  } catch {
    return '';
  }
}

/**
 * @param {unknown} phone
 * @param {unknown} name
 */
export function setPendingCustomerName(phone, name) {
  if (typeof window === 'undefined') return;
  const key = storageKey(phone);
  if (!key) return;
  const normalized = normalizePendingCustomerName(name);
  try {
    if (!normalized) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, normalized);
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown} phone
 */
export function clearPendingCustomerName(phone) {
  if (typeof window === 'undefined') return;
  const key = storageKey(phone);
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Remove all pending-name keys (logout / session wipe). */
export function clearAllPendingCustomerNames() {
  if (typeof window === 'undefined') return;
  try {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PENDING_CUSTOMER_NAME_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
