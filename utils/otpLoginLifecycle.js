/**
 * Login OTP lifecycle helpers.
 *
 * Backend (`OTP_RESEND_SECONDS`, default 60) keeps an unconsumed challenge and
 * rejects a new send with reason `resend_cooldown`. Leaving login remounts the
 * phone step — this module restores the outstanding OTP step and maps that
 * response to "continue with existing OTP" instead of a dead-end error.
 */

/** Must match backend `OTP_RESEND_SECONDS` default. */
export const OTP_RESEND_COOLDOWN_SEC = 60;

/** Must match backend `OTP_TTL_SECONDS` default — pending session max age. */
export const OTP_PENDING_TTL_SEC = 300;

export const PENDING_LOGIN_OTP_STORAGE_KEY = 'yaadro_pending_login_otp_v1';

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isOtpResendCooldownError(err) {
  const reason =
    err?.details?.reason ||
    err?.data?.error?.details?.reason ||
    err?.error?.details?.reason;
  if (reason === 'resend_cooldown') return true;
  const msg = String(err?.message || err?.data?.error?.message || '').toLowerCase();
  return msg.includes('otp already sent recently') || msg.includes('sent recently');
}

/**
 * @param {unknown} err
 * @returns {number}
 */
export function getOtpRetryAfterSeconds(err) {
  const raw =
    err?.details?.retryAfterSeconds ??
    err?.data?.error?.details?.retryAfterSeconds ??
    err?.error?.details?.retryAfterSeconds;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.ceil(n);
  return OTP_RESEND_COOLDOWN_SEC;
}

/**
 * @param {{ phone: string, shopId: string, resendUntilMs: number, expiresAtMs: number }} payload
 */
export function writePendingLoginOtp(payload) {
  if (typeof window === 'undefined') return;
  try {
    const phone = String(payload?.phone || '').trim();
    const shopId = String(payload?.shopId || '').trim();
    const resendUntilMs = Number(payload?.resendUntilMs) || 0;
    const expiresAtMs = Number(payload?.expiresAtMs) || 0;
    if (!phone || !shopId || !expiresAtMs) {
      window.sessionStorage.removeItem(PENDING_LOGIN_OTP_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      PENDING_LOGIN_OTP_STORAGE_KEY,
      JSON.stringify({ phone, shopId, resendUntilMs, expiresAtMs })
    );
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{ phone: string, shopId: string, resendUntilMs: number, expiresAtMs: number } | null}
 */
export function readPendingLoginOtp() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_LOGIN_OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const phone = String(parsed?.phone || '').trim();
    const shopId = String(parsed?.shopId || '').trim();
    const resendUntilMs = Number(parsed?.resendUntilMs) || 0;
    const expiresAtMs = Number(parsed?.expiresAtMs) || 0;
    if (!phone || !shopId || !expiresAtMs) return null;
    if (Date.now() > expiresAtMs) {
      window.sessionStorage.removeItem(PENDING_LOGIN_OTP_STORAGE_KEY);
      return null;
    }
    return { phone, shopId, resendUntilMs, expiresAtMs };
  } catch {
    return null;
  }
}

export function clearPendingLoginOtp() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_LOGIN_OTP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ phone: string, shopId: string, retryAfterSeconds?: number }} args
 */
export function markPendingLoginOtpAfterSend({ phone, shopId, retryAfterSeconds }) {
  const now = Date.now();
  const waitSec =
    Number.isFinite(Number(retryAfterSeconds)) && Number(retryAfterSeconds) > 0
      ? Math.ceil(Number(retryAfterSeconds))
      : OTP_RESEND_COOLDOWN_SEC;
  writePendingLoginOtp({
    phone,
    shopId,
    resendUntilMs: now + waitSec * 1000,
    expiresAtMs: now + OTP_PENDING_TTL_SEC * 1000,
  });
}
