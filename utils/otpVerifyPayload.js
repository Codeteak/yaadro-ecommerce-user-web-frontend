/**
 * POST /api/auth/otp/verify — JSON body must contain only: phone, shopId, code.
 * (No requestedSessionDays or other keys.)
 *
 * All storefront/auth APIs expect **10-digit** Indian mobile (no +91 prefix).
 */

/**
 * @typedef {{ phone: string, shopId: string, code: string }} OtpVerifyRequestBody
 */

const INDIAN_MOBILE_NATIONAL_RE = /^[6-9]\d{9}$/;

/**
 * Normalize phone for API payloads: 10-digit national number only (strips +91 / 91 / leading 0).
 * Returns empty string unless the number is a valid Indian mobile (starts with 6–9).
 * @param {unknown} phone
 * @returns {string} Ten digits or empty string if invalid.
 */
export function normalizePhoneForApi(phone) {
  if (phone == null) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  let national = '';
  if (digits.length === 12 && digits.startsWith('91')) {
    national = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return '';
  }

  return national.length === 10 && INDIAN_MOBILE_NATIONAL_RE.test(national) ? national : '';
}

/** @deprecated Use `normalizePhoneForApi` — kept for existing imports. */
export function normalizeOtpPhone(phone) {
  return normalizePhoneForApi(phone);
}

/** Display helper (+91XXXXXXXXXX) — not sent to the backend. */
export function formatPhoneForDisplay(phone) {
  const ten = normalizePhoneForApi(phone);
  if (ten.length !== 10) return String(phone ?? '').trim();
  return `+91${ten}`;
}

/**
 * Builds the verify payload with exactly three keys (in insertion order: phone, shopId, code).
 * @param {{ phone: unknown, shopId: unknown, code: unknown }} input
 * @returns {OtpVerifyRequestBody}
 */
export function buildOtpVerifyRequestBody({ phone, shopId, code }) {
  return {
    phone: normalizePhoneForApi(phone),
    shopId: shopId != null ? String(shopId).trim() : '',
    code: code != null ? String(code).trim() : '',
  };
}

/**
 * Returns a new object with only keys allowed on POST /api/auth/otp/verify (defensive).
 * @param {Record<string, unknown>} raw
 * @returns {OtpVerifyRequestBody}
 */
export function sanitizeOtpVerifyApiPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { phone: '', shopId: '', code: '' };
  }
  return buildOtpVerifyRequestBody({
    phone: raw.phone,
    shopId: raw.shopId,
    code: raw.code,
  });
}
