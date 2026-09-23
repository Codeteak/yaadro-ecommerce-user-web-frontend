import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addOrMergeCartLine,
  buildPersistableCartLineFromProduct,
} from './cartLinePersist.js';

test('sold-by-weight cart line stores unit_size 1 and kg qty merge', () => {
  const line = buildPersistableCartLineFromProduct({
    id: 'orange-1',
    name: 'Orange',
    price: 80,
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
    selectedSize: {
      packCount: 1,
      weight: 0.25,
      unit: 'kg',
      price: 20,
      label: '250 g',
    },
  });
  assert.ok(line);
  assert.equal(line.soldByWeight, true);
  assert.equal(line.sold_by_weight, true);
  assert.equal(line.unit_size, '1');
  assert.equal(line.weightStepKg, 0.25);
  assert.equal(line.weight, null);
  assert.equal(line.unit, 'kg');
  assert.match(String(line.cartItemKey), /_sbw$/);

  const cart = addOrMergeCartLine([], line, 0.25);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 0.25);

  const line500 = buildPersistableCartLineFromProduct({
    id: 'orange-1',
    name: 'Orange',
    price: 80,
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
    selectedSize: {
      packCount: 2,
      weight: 0.5,
      unit: 'kg',
      price: 40,
      label: '500 g',
    },
  });
  const merged = addOrMergeCartLine(cart, line500, 0.5);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, 0.75);
});

test('packed weight-step cart line keeps showcasing unit_size and integer packs', () => {
  const line = buildPersistableCartLineFromProduct({
    id: 'apple-1',
    name: 'Apple',
    price: 100,
    unit: 'kg',
    unit_size: 0.25,
    selectedSize: {
      packCount: 2,
      weight: 0.5,
      unit: 'kg',
      price: 50,
      label: '500 g',
      weightStep: true,
    },
  });
  assert.ok(line);
  assert.equal(line.soldByWeight, undefined);
  assert.equal(String(line.unit_size), '0.25');

  const cart = addOrMergeCartLine([], line, 2);
  assert.equal(cart[0].quantity, 2);
});
