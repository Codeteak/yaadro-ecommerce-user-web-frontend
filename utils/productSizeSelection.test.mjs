import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAvailableSizes,
  resolveSelectedSize,
} from './productSizeSelection.js';

test('buildAvailableSizes derives single size from product price', () => {
  const sizes = buildAvailableSizes({
    id: '1',
    weight: '1',
    unit: 'kg',
    price: 99,
  });
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].price, 99);
});

test('resolveSelectedSize picks fresh price after catalog refetch', () => {
  const availableSizes = [{ weight: '1', unit: 'kg', price: 120 }];
  const staleSelection = { weight: '1', unit: 'kg', price: 99 };
  const resolved = resolveSelectedSize(availableSizes, staleSelection);
  assert.equal(resolved.price, 120);
});
