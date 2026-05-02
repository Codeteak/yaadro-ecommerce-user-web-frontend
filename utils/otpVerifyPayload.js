/**
 * POST /api/auth/otp/verify — JSON body must contain only: phone, shopId, code.
 * (No requestedSessionDays or other keys.)
 */

/**
 * @typedef {{ phone: string, shopId: string, code: string }} OtpVerifyRequestBody
 */

/**
 * Trim; strip spaces, dashes, parentheses.
 * Indian mobiles: 10-digit local numbers and `91…` without `+` become **+91** E.164 so
 * `POST /auth/otp/request` and `POST /auth/otp/verify` use the same `phone` string.
 */
export function normalizeOtpPhone(phone) {
  if (phone == null) return '';
  const stripped = String(phone).trim().replace(/[\s().-]/g, '');
  if (!stripped) return '';

  if (stripped.startsWith('+')) return stripped;

  const digits = stripped.replace(/\D/g, '');
  if (!digits) return stripped;

  // 919XXXXXXXXX (12 digits) — add leading +
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  // 0XXXXXXXXXX (leading 0 + 10-digit mobile)
  if (digits.length === 11 && digits.startsWith('0')) {
    const national = digits.slice(1);
    if (national.length === 10) {
      return `+91${national}`;
    }
  }

  // 10-digit local mobile → +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Other formats: do not guess country code (caller / server can validate).
  return stripped;
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
