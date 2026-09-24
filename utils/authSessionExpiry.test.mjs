import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isProtectedCustomerPath,
  shouldRedirectAfterSessionExpiry,
  shouldSkipSessionExpiryForApiPath,
  shouldInvalidateSessionOnApiError,
} from './authSessionExpiry.js';

describe('authSessionExpiry route classification', () => {
  it('treats account/order surfaces as protected', () => {
    assert.equal(isProtectedCustomerPath('/profile'), true);
    assert.equal(isProtectedCustomerPath('/orders'), true);
    assert.equal(isProtectedCustomerPath('/orders/abc'), true);
    assert.equal(isProtectedCustomerPath('/addresses'), true);
    assert.equal(isProtectedCustomerPath('/add/address'), true);
    assert.equal(isProtectedCustomerPath('/order'), true);
    assert.equal(isProtectedCustomerPath('/order/track'), true);
  });

  it('keeps public shopping routes unprotected', () => {
    assert.equal(isProtectedCustomerPath('/'), false);
    assert.equal(isProtectedCustomerPath('/products'), false);
    assert.equal(isProtectedCustomerPath('/products/123'), false);
    assert.equal(isProtectedCustomerPath('/categories'), false);
    assert.equal(isProtectedCustomerPath('/search'), false);
    assert.equal(isProtectedCustomerPath('/cart'), false);
    assert.equal(isProtectedCustomerPath('/wishlist'), false);
    assert.equal(isProtectedCustomerPath('/login'), false);
  });

  it('excludes soft checkout paths from protected classification', () => {
    assert.equal(isProtectedCustomerPath('/checkout'), false);
    assert.equal(isProtectedCustomerPath('/order-success'), false);
  });

  it('never hard-redirects after session expiry (React handles protected → home)', () => {
    assert.equal(shouldRedirectAfterSessionExpiry(), false);
  });

  it('skips session invalidation for auth API paths', () => {
    assert.equal(shouldSkipSessionExpiryForApiPath('auth/login'), true);
    assert.equal(shouldSkipSessionExpiryForApiPath('auth/refresh'), true);
    assert.equal(shouldSkipSessionExpiryForApiPath('orders'), false);
  });

  it('invalidates session on auth 401 but not business codes', () => {
    assert.equal(
      shouldInvalidateSessionOnApiError({ status: 401, path: 'orders', json: {} }),
      true,
    );
    assert.equal(
      shouldInvalidateSessionOnApiError({
        status: 401,
        path: 'cart',
        json: { error: { code: 'CART_EMPTY' } },
      }),
      false,
    );
    assert.equal(
      shouldInvalidateSessionOnApiError({ status: 403, path: 'orders', json: {} }),
      false,
    );
  });
});
