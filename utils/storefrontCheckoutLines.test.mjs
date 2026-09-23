import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutLinesFromCartItems } from './storefrontCheckoutLines.js';

test('checkout keeps fractional sold-by-weight kg qty (does not ceil to 1)', () => {
  const lines = buildCheckoutLinesFromCartItems([
    {
      productId: 'orange-1',
      quantity: 0.25,
      soldByWeight: true,
    },
  ]);
  assert.deepEqual(lines, [{ productId: 'orange-1', quantity: 0.25 }]);
});

test('checkout merges same productId sold-by-weight qtys', () => {
  const lines = buildCheckoutLinesFromCartItems([
    { productId: 'orange-1', quantity: 0.25, soldByWeight: true },
    { productId: 'orange-1', quantity: 0.5, soldByWeight: true },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 0.75);
});

test('checkout skips bundle reward lines', () => {
  const lines = buildCheckoutLinesFromCartItems([
    { productId: 'milk-1', quantity: 2 },
    {
      productId: 'milk-1',
      quantity: 1,
      isBundleReward: true,
      id: 'milk-1:bundle-reward',
    },
  ]);
  assert.deepEqual(lines, [{ productId: 'milk-1', quantity: 2 }]);
});

test('checkout ignores rows without productId', () => {
  const lines = buildCheckoutLinesFromCartItems([
    { productId: '', quantity: 1 },
    { quantity: 0.25, soldByWeight: true },
  ]);
  assert.deepEqual(lines, []);
});
