import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAvailableSizes,
  resolveSelectedSize,
  sizeAddQuantity,
  sizePackCount,
  cartQuantityStep,
  isSoldByWeightProduct,
  hasCustomWeightStep,
  weightStepLinePrices,
  soldByWeightStepKg,
  soldByWeightPackUnitPrice,
  kgQtyToPackCount,
  packCountToKgQty,
  formatCartQtyControlLabel,
  formatSoldByWeightPurchaseLabel,
} from './productSizeSelection.js';
import {
  formatOrderLineWeight,
  sellableUnitFactor,
  massAmountInKg,
  lineTotalFromUnitPricing,
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

test('packed product with unit_size 0.25 does NOT invent weight chips', () => {
  const sizes = buildAvailableSizes({
    id: 'apple',
    unit: 'kg',
    unit_size: 0.25,
    price: 100,
  });
  assert.equal(sizes.length, 0);
});

test('sold_by_weight with custom 250 g step shows only 250 g and 500 g', () => {
  const sizes = buildAvailableSizes({
    id: 'orange',
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
    price: 80,
  });
  assert.equal(hasCustomWeightStep({
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: true,
  }), true);
  assert.equal(sizes.length, 2);
  assert.equal(sizes[0].label, '250 g');
  assert.equal(sizes[0].weight, 0.25);
  assert.equal(sizes[0].payPrice, 20);
  assert.equal(sizes[1].label, '500 g');
  assert.equal(sizes[1].weight, 0.5);
  assert.equal(sizes[1].payPrice, 40);
});

test('soldByWeight camelCase with custom step builds chips', () => {
  const sizes = buildAvailableSizes({
    id: 'onion',
    unit: 'kg',
    unitSize: 0.25,
    soldByWeight: true,
    price: 40,
  });
  assert.equal(sizes.length, 2);
  assert.equal(sizes[1].label, '500 g');
  assert.equal(sizes[1].payPrice, 20);
});

test('sold_by_weight without custom step (unit_size 1) has no chips', () => {
  const sizes = buildAvailableSizes({
    id: 'potato',
    unit: 'kg',
    unit_size: 1,
    sold_by_weight: true,
    price: 30,
  });
  assert.equal(hasCustomWeightStep({
    unit: 'kg',
    unit_size: 1,
    sold_by_weight: true,
  }), false);
  assert.equal(sizes.length, 0);
});

test('sizeAddQuantity uses kg amount for custom-weight chips', () => {
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
  assert.equal(sizePackCount(sizes[1]), 2);
});

test('sizeAddQuantity for sold-by-weight without size uses cart step', () => {
  const product = {
    id: 'potato',
    unit: 'kg',
    unit_size: 1,
    sold_by_weight: true,
    price: 30,
  };
  assert.equal(sizeAddQuantity(product, null), 0.25);
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

test('banana ₹45/kg with 250 g custom step shows ₹11.25 and 500 g chip', () => {
  const product = {
    id: 'banana',
    price: 45,
    unit: 'kg',
    unit_size: '0.25',
    soldByWeight: true,
  };
  assert.equal(hasCustomWeightStep(product), true);
  const sizes = buildAvailableSizes(product);
  assert.equal(sizes.length, 2);
  assert.equal(sizes[0].label, '250 g');
  assert.equal(sizes[1].label, '500 g');
  assert.equal(sizes[0].payPrice, 11.25);
  assert.equal(sizes[1].payPrice, 22.5);
  const step = weightStepLinePrices(product, sizes[0]);
  assert.equal(step.pay, 11.25);
  assert.equal(step.list, 11.25);
  assert.equal(sizeAddQuantity(product, sizes[0]), 0.25);
  assert.equal(sizeAddQuantity(product, sizes[1]), 0.5);
});

test('sold_by_weight string true still builds custom weight chips', () => {
  const sizes = buildAvailableSizes({
    price: 45,
    unit: 'kg',
    unit_size: 0.25,
    sold_by_weight: 'true',
  });
  assert.equal(sizes.length, 2);
  assert.equal(sizes[0].payPrice, 11.25);
});

test('gram-scale unit_size 725 with ₹165 does NOT show ₹119625 chips', () => {
  const product = {
    id: 'veg',
    unit: 'g',
    unit_size: 725,
    sold_by_weight: true,
    price: 165,
  };
  assert.equal(hasCustomWeightStep(product), true);
  const sizes = buildAvailableSizes(product);
  assert.equal(sizes.length, 2);
  assert.equal(sizes[0].label, '725 g');
  assert.equal(sizes[0].weight, 0.725);
  // 165 ₹/kg × 0.725 kg ≈ 119.625 — never 165 × 725
  assert.ok(Math.abs(sizes[0].payPrice - 119.625) < 0.01);
  assert.ok(sizes[0].payPrice < 1000);
});

test('gram-count mislabeled as kg still prices in kg', () => {
  const sizes = buildAvailableSizes({
    id: 'veg2',
    unit: 'kg',
    unit_size: 725,
    sold_by_weight: true,
    price: 165,
  });
  assert.equal(sizes[0].weight, 0.725);
  assert.ok(Math.abs(sizes[0].price - 119.625) < 0.01);
});

test('sellableUnitFactor converts gram-scale packed unit_size for cart', () => {
  assert.equal(
    sellableUnitFactor({ unit: 'g', unit_size: 725, price: 165 }),
    0.725
  );
  assert.equal(
    sellableUnitFactor({ unit: 'kg', unit_size: 725 }),
    0.725
  );
  assert.equal(sellableUnitFactor({ unit: 'kg', unit_size: 0.5 }), 0.5);
  assert.equal(sellableUnitFactor({ unit: 'piece', unit_size: 2 }), 2);
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

test('custom weight pack model: ₹120 / 200g × 5 = 1kg = ₹600', () => {
  // DB: price_per_kg = 600, unit_size = 0.2 kg (customer "₹120 / 200g")
  const product = {
    id: 'apple',
    soldByWeight: true,
    unit: 'kg',
    unit_size: 0.2,
    price: 600,
  };
  assert.equal(soldByWeightStepKg(product), 0.2);
  assert.equal(soldByWeightPackUnitPrice(product, 600), 120);
  assert.equal(kgQtyToPackCount(0.2, 0.2), 1);
  assert.equal(kgQtyToPackCount(1, 0.2), 5);
  assert.equal(packCountToKgQty(5, 0.2), 1);
  assert.equal(formatCartQtyControlLabel(product, 1), '5');
  assert.equal(
    formatSoldByWeightPurchaseLabel({ ...product, weightStepKg: 0.2, quantity: 1 }, 1),
    '200 g × 5 · 1 kg'
  );
  // Authoritative line total stays price_per_kg × kg qty
  assert.equal(600 * packCountToKgQty(5, 0.2), 600);
  assert.equal(soldByWeightPackUnitPrice(product, 600) * 5, 600);
});

test('qty control never shows fractional kg for custom-weight steps', () => {
  const line = {
    soldByWeight: true,
    weightStepKg: 0.25,
    quantity: 0.75,
  };
  assert.equal(formatCartQtyControlLabel(line, 0.75), '3');
  assert.equal(formatCartQtyControlLabel(line, 0.25), '1');
});
