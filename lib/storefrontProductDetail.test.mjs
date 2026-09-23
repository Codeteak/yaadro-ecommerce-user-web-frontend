/**
 * Run: npm run test:product-detail
 *   or: node --test lib/storefrontProductDetail.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStorefrontProductUpstreamPath,
  filterRelatedProducts,
} from './storefrontProductDetail.js';

const UUID = '11111111-1111-4111-8111-111111111111';

test('resolveStorefrontProductUpstreamPath routes UUID to /products/id/:id', () => {
  assert.equal(
    resolveStorefrontProductUpstreamPath(UUID),
    `/api/storefront/products/id/${UUID}`
  );
});

test('resolveStorefrontProductUpstreamPath routes slug to /products/:slug', () => {
  assert.equal(
    resolveStorefrontProductUpstreamPath('amul-ghee-1l'),
    '/api/storefront/products/amul-ghee-1l'
  );
});

test('resolveStorefrontProductUpstreamPath encodes special slug characters', () => {
  assert.equal(
    resolveStorefrontProductUpstreamPath('foo/bar baz'),
    `/api/storefront/products/${encodeURIComponent('foo/bar baz')}`
  );
});

test('resolveStorefrontProductUpstreamPath returns null for empty input', () => {
  assert.equal(resolveStorefrontProductUpstreamPath(null), null);
  assert.equal(resolveStorefrontProductUpstreamPath(undefined), null);
  assert.equal(resolveStorefrontProductUpstreamPath(''), null);
  assert.equal(resolveStorefrontProductUpstreamPath('   '), null);
});

test('resolveStorefrontProductUpstreamPath does not treat non-uuid hex as id path', () => {
  assert.equal(
    resolveStorefrontProductUpstreamPath('not-a-uuid'),
    '/api/storefront/products/not-a-uuid'
  );
});

test('filterRelatedProducts excludes current product and respects limit', () => {
  const rows = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
  ];
  assert.deepEqual(
    filterRelatedProducts(rows, 'b', 2).map((p) => p.id),
    ['a', 'c']
  );
});

test('filterRelatedProducts keeps order and skips missing ids', () => {
  const rows = [{ id: 'a' }, { name: 'no-id' }, { id: 'c' }];
  assert.deepEqual(
    filterRelatedProducts(rows, 'a').map((p) => p.id),
    ['c']
  );
});

test('filterRelatedProducts without exclude returns capped list', () => {
  const rows = [{ id: '1' }, { id: '2' }, { id: '3' }];
  assert.equal(filterRelatedProducts(rows, null, 2).length, 2);
  assert.equal(filterRelatedProducts(rows, '', 2).length, 2);
});

test('filterRelatedProducts tolerates non-array input', () => {
  assert.deepEqual(filterRelatedProducts(null, 'x'), []);
  assert.deepEqual(filterRelatedProducts(undefined, 'x'), []);
});
