import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCartLinePaidQty,
  normalizeCartLineCatalogPricing,
  sumCartShelfPayable,
} from './cartPromotions.js';
import { lineTotalFromUnitPricing } from './productUtils.js';

test('getCartLinePaidQty keeps fractional sold-by-weight qty', () => {
  assert.equal(getCartLinePaidQty({ quantity: 0.25, soldByWeight: true }), 0.25);
  assert.equal(getCartLinePaidQty({ quantity: 0.75 }), 0.75);
});

test('normalizeCartLineCatalogPricing does not inflate 0.25 kg to 1 kg', () => {
  const next = normalizeCartLineCatalogPricing({
    id: 'orange-1',
    quantity: 0.25,
    price: 80,
    soldByWeight: true,
    sold_by_weight: true,
    unit_size: '1',
  });
  // Guest shelf path: line total should be 80 * 0.25 = 20 when priced from unit.
  const shelf = lineTotalFromUnitPricing(80, 0.25, {
    soldByWeight: true,
    unit_size: '1',
  });
  assert.equal(shelf, 20);
  assert.equal(getCartLinePaidQty(next), 0.25);
});

test('sumCartShelfPayable uses fractional paid qty', () => {
  const sum = sumCartShelfPayable([
    {
      id: 'orange-1',
      quantity: 0.25,
      price: 80,
      soldByWeight: true,
      unit_size: '1',
    },
  ]);
  assert.equal(sum, 20);
});
