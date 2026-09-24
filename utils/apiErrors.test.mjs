/**
 * Run: node --test utils/apiErrors.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getApiErrorCode,
  getCheckoutErrorMessage,
  getAddressSaveErrorMessage,
  classifyDeliveryCheckResult,
  isNetworkError,
  getPinDeliveryCheckMessage,
} from './apiErrors.js';

test('getApiErrorCode reads nested and top-level codes', () => {
  assert.equal(getApiErrorCode({ data: { error: { code: 'CART_EMPTY' } } }), 'CART_EMPTY');
  assert.equal(getApiErrorCode({ code: 'ADDRESS_NOT_SERVICEABLE' }), 'ADDRESS_NOT_SERVICEABLE');
  assert.equal(getApiErrorCode({}), null);
});

test('getCheckoutErrorMessage maps known codes and network failures', () => {
  assert.equal(
    getCheckoutErrorMessage({ data: { error: { code: 'ADDRESS_REQUIRED' } } }),
    'Please add a delivery address before continuing.',
  );
  assert.equal(
    getCheckoutErrorMessage({ data: { error: { code: 'ADDRESS_NOT_SERVICEABLE' } } }),
    "This address is outside this shop's delivery area. Choose another address or move the map pin.",
  );
  assert.equal(
    getCheckoutErrorMessage({ data: { error: { code: 'ADDRESS_COORDINATES_INVALID' } } }),
    'Your delivery address map pin is invalid. Please update the pin on the map and try again.',
  );
  assert.equal(
    getCheckoutErrorMessage({ data: { error: { code: 'SHOP_LOCATION_MISSING' } } }),
    'This shop is not ready to take delivery orders yet. Please try again later.',
  );
  assert.equal(
    getCheckoutErrorMessage({ name: 'TypeError', message: 'Failed to fetch' }),
    'Unable to connect. Please check your internet connection and try again.',
  );
  assert.equal(
    getCheckoutErrorMessage({ status: 401, message: 'Unauthorized' }),
    'Your session expired. Please sign in again.',
  );
});

test('getAddressSaveErrorMessage preserves form-recovery copy for network and validation', () => {
  assert.equal(
    getAddressSaveErrorMessage({ message: 'Failed to fetch', name: 'TypeError' }),
    'Unable to save your address right now. Please check your connection and try again.',
  );
  assert.equal(
    getAddressSaveErrorMessage({ message: 'line1 must not be null' }),
    'Please enter Address Line 1.',
  );
  assert.equal(
    getAddressSaveErrorMessage({ status: 500 }),
    "We couldn't save your address right now. Please try again.",
  );
});

test('classifyDeliveryCheckResult distinguishes out-of-area from API failure', () => {
  const ok = classifyDeliveryCheckResult({ serviceable: true }, null);
  assert.equal(ok.kind, 'serviceable');

  const out = classifyDeliveryCheckResult({ serviceable: false }, null);
  assert.equal(out.kind, 'not_serviceable');
  assert.match(out.message, /outside this shop's delivery area/i);

  const net = classifyDeliveryCheckResult(null, {
    name: 'TypeError',
    message: 'Failed to fetch',
  });
  assert.equal(net.kind, 'network');
  assert.match(net.message, /check your internet/i);
  assert.notEqual(net.kind, 'not_serviceable');
});

test('isNetworkError detects common offline cases', () => {
  assert.equal(isNetworkError({ name: 'TypeError', message: 'Failed to fetch' }), true);
  assert.equal(isNetworkError({ status: 0 }), true);
  assert.equal(isNetworkError({ status: 400, message: 'Bad request' }), false);
});

test('getPinDeliveryCheckMessage covers loading / out-of-area / verify error', () => {
  assert.equal(
    getPinDeliveryCheckMessage({ loading: true, error: null, serviceable: null }),
    'Checking delivery availability…',
  );
  assert.match(
    getPinDeliveryCheckMessage({ loading: false, error: null, serviceable: false }),
    /outside this shop's delivery area/i,
  );
  assert.match(
    getPinDeliveryCheckMessage({
      loading: false,
      error: 'Failed to fetch',
      serviceable: null,
    }),
    /check your internet|could not verify/i,
  );
});
