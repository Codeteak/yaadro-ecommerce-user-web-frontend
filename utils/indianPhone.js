/**
 * Indian mobile input helpers (10 digits, national number starts with 6–9).
 */

import { indianMobileSchema } from '../lib/validations/auth.schema';
import { normalizePhoneForApi } from './otpVerifyPayload';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Restrict input while typing: digits only, max 10, first digit 6–9.
 * Strips +91 / 91 / leading 0 prefixes when pasted.
 */
export function sanitizeIndianPhoneInput(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length >= 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  let out = '';
  for (let i = 0; i < digits.length && out.length < 10; i += 1) {
    const d = digits[i];
    if (out.length === 0) {
      if (d >= '6' && d <= '9') out += d;
    } else {
      out += d;
    }
  }
  return out;
}

export function isValidIndianMobile(phone) {
  const ten = normalizePhoneForApi(phone);
  return ten.length === 10 && INDIAN_MOBILE_REGEX.test(ten);
}

/** Live validation message while the user types (null = no error). */
export function getIndianPhoneLiveError(digits) {
  const d = sanitizeIndianPhoneInput(digits);
  if (!d) return null;
  if (d.length >= 1 && !/^[6-9]/.test(d)) {
    return 'Mobile number must start with 6, 7, 8, or 9';
  }
  if (d.length > 0 && d.length < 10) {
    return null;
  }
  if (d.length === 10 && !INDIAN_MOBILE_REGEX.test(d)) {
    return 'Enter a valid 10-digit mobile number';
  }
  return null;
}

export function getIndianPhoneSubmitError(digits) {
  const d = sanitizeIndianPhoneInput(digits);
  const result = indianMobileSchema.safeParse(d);
  if (result.success) return null;
  return result.error.issues[0]?.message || 'Enter a valid Indian mobile number';
}
