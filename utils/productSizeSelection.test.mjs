import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAvailableSizes,
  resolveSelectedSize,
  sizeAddQuantity,
  sizePackCount,
  cartQuantityStep,
  isSoldByWeightProduct,
} from './productSizeSelection.js';
import {
  formatOrderLineWeight,
  sellableUnitFactor,
} from './productUtils.js';

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

test('0.25 kg step exposes 250 g through 1 kg chips (×1…4)', () => {
  const sizes = buildAvailableSizes({
    id: 'apple',
    unit: 'kg',
    unit_size: 0.25,
    price: 100,
  });
  assert.equal(sizes.length, 4);
  assert.equal(sizes[0].label, '250 g');
  assert.equal(sizes[0].price, 25);
  assert.equal(sizes[0].packCount, 1);
  assert.equal(sizes[1].label, '500 g');
  assert.equal(sizes[1].price, 50);
  assert.equal(sizes[2].label, '750 g');
  assert.equal(sizes[2].price, 75);
  assert.equal(sizes[3].label, '1 kg');
  assert.equal(sizes[3].price, 100);
  assert.equal(sizes[3].packCount, 4);
  assert.equal(sizes[0].weightStep, true);
});

test('sold_by_weight with 250 g step uses kg qty chips', () => {
  const sizes = buildAvailableSizes({
    id: 'orange',
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
    price: 80,
  });
  assert.equal(sizes.length, 4);
  assert.equal(sizes[0].label, '250 g');
  assert.equal(sizes[0].weight, 0.25);
  assert.equal(sizes[0].payPrice, 20);
  assert.equal(sizes[3].label, '1 kg');
  assert.equal(sizes[3].weight, 1);
});

test('soldByWeight camelCase also builds step chips', () => {
  const sizes = buildAvailableSizes({
    id: 'onion',
    unit: 'kg',
    unitSize: 0.25,
    soldByWeight: true,
    price: 40,
  });
  assert.equal(sizes.length, 4);
  assert.equal(sizes[1].label, '500 g');
  assert.equal(sizes[1].payPrice, 20);
});

test('sold_by_weight with unit_size 1 exposes 1–4 kg chips', () => {
  const sizes = buildAvailableSizes({
    id: 'potato',
    unit: 'kg',
    unit_size: 1,
    sold_by_weight: true,
    price: 30,
  });
  assert.equal(sizes.length, 4);
  assert.equal(sizes[0].label, '1 kg');
  assert.equal(sizes[0].weight, 1);
  assert.equal(sizes[3].weight, 4);
  assert.equal(sizes[3].payPrice, 120);
});

test('sizeAddQuantity uses kg amount for sold-by-weight chips', () => {
  const product = {
    id: 'orange',
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
    price: 80,
  };
  const sizes = buildAvailableSizes(product);
  assert.equal(sizeAddQuantity(product, sizes[0]), 0.25);
  assert.equal(sizeAddQuantity(product, sizes[1]), 0.5);
  assert.equal(sizeAddQuantity(product, sizes[3]), 1);
  assert.equal(sizePackCount(sizes[3]), 4);
});

test('sizeAddQuantity uses pack count for packed weight-step products', () => {
  const product = {
    id: 'apple',
    unit: 'kg',
    unit_size: 0.25,
    price: 100,
  };
  const sizes = buildAvailableSizes(product);
  assert.equal(sizeAddQuantity(product, sizes[0]), 1);
  assert.equal(sizeAddQuantity(product, sizes[1]), 2);
  assert.equal(sellableUnitFactor(product), 0.25);
});

test('cartQuantityStep uses weightStepKg / catalog step for sold-by-weight', () => {
  assert.equal(
    cartQuantityStep({
      soldByWeight: true,
      weightStepKg: 0.25,
      unit_size: '1',
    }),
    0.25
  );
  assert.equal(
    cartQuantityStep({
      sold_by_weight: true,
      unit_size: 0.5,
    }),
    0.5
  );
  assert.equal(cartQuantityStep({ id: 'milk', unit: 'piece' }), 1);
});

test('isSoldByWeightProduct reads camel and snake flags', () => {
  assert.equal(isSoldByWeightProduct({ soldByWeight: true }), true);
  assert.equal(isSoldByWeightProduct({ sold_by_weight: true }), true);
  assert.equal(isSoldByWeightProduct({ product: { soldByWeight: true } }), true);
  assert.equal(isSoldByWeightProduct({ id: 'x' }), false);
});

test('sellableUnitFactor is 1 for sold-by-weight lines', () => {
  assert.equal(
    sellableUnitFactor({ soldByWeight: true, unit_size: 0.25 }),
    1
  );
});

test('order history shows ordered grams, billed grams, and keeps a matching weight as one label', () => {
  assert.equal(
    formatOrderLineWeight({
      unit: 'kg',
      unitSize: 1,
      quantity: 0.255,
      ordered_quantity: 0.25,
    }),
    'Ordered 250 g · Billed 255 g'
  );
  assert.equal(
    formatOrderLineWeight({
      unit: 'kg',
      unitSize: 1,
      quantity: 0.248,
      ordered_quantity: 0.25,
    }),
    'Ordered 250 g · Billed 248 g'
  );
  assert.equal(
    formatOrderLineWeight({
      unit: 'kg',
      unitSize: 1,
      quantity: 0.25,
      ordered_quantity: 0.25,
    }),
    '250 g'
  );
});

test('sold-by-weight order lines use unit_size 1 so qty is already kg', () => {
  assert.equal(
    formatOrderLineWeight({
      unit: 'kg',
      unit_size: '1',
      soldByWeight: true,
      quantity: 0.5,
      ordered_quantity: 0.5,
    }),
    '500 g'
  );
});

test('resolveSelectedSize picks fresh price after catalog refetch', () => {
  const availableSizes = [{ weight: '1', unit: 'kg', price: 120 }];
  const staleSelection = { weight: '1', unit: 'kg', price: 99 };
  const resolved = resolveSelectedSize(availableSizes, staleSelection);
  assert.equal(resolved.price, 120);
});
