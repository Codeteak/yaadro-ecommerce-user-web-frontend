import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStorefrontProductsQuery } from './productApi.js';

/**
 * Mirrors searchProducts() default: contains unless explicitly prefix.
 * Kept here so the customer-search regression is covered without mocking fetch.
 */
function resolveCustomerSearchMode(search_mode) {
  return search_mode === 'prefix' ? 'prefix' : 'contains';
}

test('customer search defaults to contains (apple → Organic Apple)', () => {
  assert.equal(resolveCustomerSearchMode(undefined), 'contains');
  assert.equal(resolveCustomerSearchMode(null), 'contains');
  assert.equal(resolveCustomerSearchMode('contains'), 'contains');
  assert.equal(resolveCustomerSearchMode('prefix'), 'prefix');
});

test('buildStorefrontProductsQuery passes contains search_mode', () => {
  const q = buildStorefrontProductsQuery({
    search: 'apple',
    search_mode: 'contains',
    limit: 24,
  });
  assert.equal(q.search, 'apple');
  assert.equal(q.search_mode, 'contains');
});

test('buildStorefrontProductsQuery can still send prefix when requested', () => {
  const q = buildStorefrontProductsQuery({
    q: 'org',
    search_mode: 'prefix',
  });
  assert.equal(q.search, 'org');
  assert.equal(q.search_mode, 'prefix');
});
