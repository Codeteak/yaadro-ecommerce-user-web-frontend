import test from 'node:test';
import assert from 'node:assert/strict';
import {
  customWeightListingFields,
  customWeightStepRupees,
} from './customWeightListing.js';

test('250 g step of a ₹250/kg apple is ₹62.50', () => {
  const fields = customWeightListingFields({
    sold_by_weight: true,
    unit_size: '0.25',
    unit: 'kg',
    actual_price_minor: 25000,
    final_price_minor: 25000,
  });
  assert.equal(fields.custom_weight_label, '250 g');
  assert.equal(fields.custom_weight_price_minor, '6250');
  assert.equal(fields.custom_weight_list_price_minor, undefined);
});

test('offer price is the payable step, list step is struck', () => {
  const fields = customWeightListingFields({
    sold_by_weight: true,
    unit_size: 0.25,
    base_unit: 'kg',
    actual_price_minor: '25000',
    final_price_minor: '20000',
  });
  assert.equal(fields.custom_weight_price_minor, '5000');
  assert.equal(fields.custom_weight_list_price_minor, '6250');
});

test('gram-scale unit_size 250 is 250 g, not 250 kg', () => {
  const fields = customWeightListingFields({
    soldByWeight: true,
    unitSize: 250,
    unit: 'kg',
    final_price_minor: 25000,
    actual_price_minor: 25000,
  });
  assert.equal(fields.custom_weight_label, '250 g');
  assert.equal(fields.custom_weight_price_minor, '6250');
});

test('no custom step leaves the default per-kg price', () => {
  assert.equal(
    customWeightListingFields({
      sold_by_weight: true,
      unit_size: '1',
      unit: 'kg',
      final_price_minor: 25000,
    }),
    null
  );
  assert.equal(
    customWeightListingFields({
      sold_by_weight: false,
      unit_size: '0.25',
      unit: 'kg',
      final_price_minor: 25000,
    }),
    null
  );
});

test('×2 chip is the step price times 2', () => {
  const product = { customWeightPriceMinor: '6250' };
  assert.equal(customWeightStepRupees(product, 1), 62.5);
  assert.equal(customWeightStepRupees(product, 2), 125);
  assert.equal(customWeightStepRupees(product, 6), 375);
});
