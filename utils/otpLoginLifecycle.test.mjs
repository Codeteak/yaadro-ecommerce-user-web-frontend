import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOtpRetryAfterSeconds,
  isOtpResendCooldownError,
  OTP_RESEND_COOLDOWN_SEC,
} from './otpLoginLifecycle.js';

test('detects resend_cooldown reason from details', () => {
  assert.equal(
    isOtpResendCooldownError({
      details: { reason: 'resend_cooldown', retryAfterSeconds: 42 },
    }),
    true
  );
});

test('detects legacy message without details', () => {
  assert.equal(
    isOtpResendCooldownError({
      message: 'OTP already sent recently. Please wait and try again.',
    }),
    true
  );
});

test('does not treat max-window / rate-limit as resend cooldown', () => {
  assert.equal(
    isOtpResendCooldownError({
      message: 'Too many OTP requests. Try again later.',
      details: { reason: 'max_requests_per_window' },
    }),
    false
  );
  assert.equal(isOtpResendCooldownError({ status: 429, message: 'Too many' }), false);
});

test('retryAfterSeconds falls back to backend default', () => {
  assert.equal(getOtpRetryAfterSeconds({}), OTP_RESEND_COOLDOWN_SEC);
  assert.equal(
    getOtpRetryAfterSeconds({ details: { retryAfterSeconds: 17.2 } }),
    18
  );
});
