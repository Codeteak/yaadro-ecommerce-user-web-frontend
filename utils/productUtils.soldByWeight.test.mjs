import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCartLineVariantLabel,
  sellableUnitFactor,
  lineTotalFromUnitPricing,
  massAmountInKg,
} from './productUtils.js';

test('sellableUnitFactor is 1 for sold-by-weight even when unit_size is 0.25', () => {
  assert.equal(sellableUnitFactor({ soldByWeight: true, unit_size: 0.25 }), 1);
  assert.equal(sellableUnitFactor({ sold_by_weight: true, unitSize: 0.5 }), 1);
});

test('massAmountInKg converts gram packs that caused ₹119600 display', () => {
  assert.equal(massAmountInKg(725, 'g'), 0.725);
  assert.equal(massAmountInKg(725, 'kg'), 0.725);
  assert.equal(massAmountInKg(0.25, 'kg'), 0.25);
  assert.equal(lineTotalFromUnitPricing(165, 1, { unit: 'g', unit_size: 725 }), 119.625);
});

test('lineTotal for sold-by-weight is price × kg qty', () => {
  assert.equal(
    lineTotalFromUnitPricing(80, 0.25, { soldByWeight: true, unit_size: '1' }),
    20
  );
  assert.equal(
    lineTotalFromUnitPricing(80, 0.75, { sold_by_weight: true }),
    60
  );
});

test('variant label shows total kg for sold-by-weight cart lines', () => {
  assert.equal(
    getCartLineVariantLabel({
      soldByWeight: true,
      quantity: 0.25,
      unit: 'kg',
      unit_size: '1',
    }),
    '250 g'
  );
  assert.equal(
    getCartLineVariantLabel({
      sold_by_weight: true,
      quantity: 0.75,
      unit: 'kg',
      unit_size: '1',
    }),
    '750 g'
  );
});

test('variant label shows pack × step total for packed weight-step lines', () => {
  assert.equal(
    getCartLineVariantLabel({
      quantity: 2,
      unit: 'kg',
      unit_size: 0.25,
    }),
    '500 g'
  );
  assert.equal(
    getCartLineVariantLabel({
      quantity: 3,
      unit: 'kg',
      unit_size: 0.25,
    }),
    '750 g'
  );
});
