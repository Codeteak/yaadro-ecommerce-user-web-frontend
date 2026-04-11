/**
 * POST /api/auth/otp/verify — JSON body must contain only: phone, shopId, code.
 * (No requestedSessionDays or other keys.)
 */

/**
 * @typedef {{ phone: string, shopId: string, code: string }} OtpVerifyRequestBody
 */

/** Trim and remove spaces so phone is sent consistently. */
export function normalizeOtpPhone(phone) {
  if (phone == null) return '';
  return String(phone).trim().replace(/\s+/g, '');
}

/**
 * Builds the verify payload with exactly three keys (in insertion order: phone, shopId, code).
 * @param {{ phone: unknown, shopId: unknown, code: unknown }} input
 * @returns {OtpVerifyRequestBody}
 */
export function buildOtpVerifyRequestBody({ phone, shopId, code }) {
  return {
    phone: normalizeOtpPhone(phone),
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
