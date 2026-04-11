/**
 * Run: npm run test:otp-payload  (or: node --test utils/otpVerifyPayload.test.mjs)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOtpVerifyRequestBody,
  sanitizeOtpVerifyApiPayload,
} from './otpVerifyPayload.js';

test('buildOtpVerifyRequestBody exposes only phone, shopId, code (no requestedSessionDays)', () => {
  const body = buildOtpVerifyRequestBody({
    phone: ' 9876543210 ',
    shopId: ' 11111111-2222-3333-4444-555555555555 ',
    code: ' 123456 ',
  });
  assert.deepEqual(Object.keys(body).sort(), ['code', 'phone', 'shopId'].sort());
  assert.equal('requestedSessionDays' in body, false);
  assert.equal(Object.keys(body).length, 3);
});

test('sanitizeOtpVerifyApiPayload strips unknown keys', () => {
  const dirty = {
    phone: '9000000000',
    shopId: 'shop-1',
    code: '9999',
    requestedSessionDays: 7,
    extra: 'nope',
  };
  const clean = sanitizeOtpVerifyApiPayload(dirty);
  assert.deepEqual(clean, {
    phone: '9000000000',
    shopId: 'shop-1',
    code: '9999',
  });
  assert.equal('requestedSessionDays' in clean, false);
});
