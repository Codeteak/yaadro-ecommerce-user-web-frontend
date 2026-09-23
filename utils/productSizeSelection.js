/**
 * Size/weight options for product cards and PDP.
 * Keeps selected variant in sync with live catalog price updates.
 */

import {
  formatMassAmountLabel,
  formatWeightUnitLabel,
  getEffectivePrice,
  getListPrice,
  resolveProductWeightAndUnit,
} from './productUtils.js';

/** Customer can buy step × 1 or × 2 only (e.g. 250 g → 250 g, 500 g). */
const WEIGHT_STEP_PACK_COUNTS = [1, 2];

function isSoldByWeight(product) {
  return product?.soldByWeight === true || product?.sold_by_weight === true;
}

export function isSoldByWeightProduct(product) {
  if (!product || typeof product !== 'object') return false;
  if (isSoldByWeight(product)) return true;
  if (product.product && isSoldByWeight(product.product)) return true;
  return false;
}

/**
 * Cart +/- step: kg fraction for sold-by-weight, otherwise 1 pack/unit.
 * Prefers `weightStepKg` stored on the cart line (catalog step before persist).
 */
export function cartQuantityStep(productOrLine) {
  if (!isSoldByWeightProduct(productOrLine)) return 1;
  const candidates = [
    productOrLine?.weightStepKg,
    productOrLine?.product?.weightStepKg,
    productOrLine?.catalogUnitSize,
    productOrLine?.product?.unit_size,
    productOrLine?.product?.unitSize,
  ];
  // Persisted SBW lines force unit_size "1" — ignore that for step.
  const persisted = Number(productOrLine?.unit_size ?? productOrLine?.unitSize);
  if (!(Number.isFinite(persisted) && Math.abs(persisted - 1) < 1e-9)) {
    candidates.push(productOrLine?.unit_size, productOrLine?.unitSize);
  }
  for (const raw of candidates) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 10000) / 10000;
  }
  return 0.25;
}

function isMassUnit(unit) {
  const u = String(unit || '').trim().toLowerCase();
  return u === 'kg' || u === 'g' || u === 'gm' || u === 'gram' || u === 'grams';
}

/**
 * kg/g sold in a step (250 g stored as 0.25 kg).
 * Returns chips for step × 1 and × 2. Prices are amount × price per base unit.
 * @param {object} product
 * @param {{ forceStep?: boolean }} [opts] — when true, also build for step === 1 (1 kg chips)
 */
function buildWeightStepSizes(product, opts = {}) {
  const { weight, unit } = resolveProductWeightAndUnit(product);
  const step = Number(weight);
  if (!isMassUnit(unit) || !Number.isFinite(step) || step <= 0) {
    return null;
  }
  if (!opts.forceStep && Math.abs(step - 1) < 1e-9) {
    return null;
  }
  const unitList = getListPrice(product) || parseFloat(product.price) || 0;
  const unitPay = getEffectivePrice(product, unitList) || unitList;
  if (!Number.isFinite(unitPay) || unitPay <= 0) return null;

  return WEIGHT_STEP_PACK_COUNTS.map((packCount) => {
    const amount = Math.round(step * packCount * 10000) / 10000;
    const label =
      formatMassAmountLabel(amount, unit) || formatWeightUnitLabel(amount, unit);
    return {
      packCount,
      weight: amount,
      unit,
      price: unitList * amount,
      payPrice: unitPay * amount,
      label,
      weightStep: true,
    };
  });
}

function packCountOf(size) {
  const n = Number(size?.packCount);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Sold-by-weight: same step chips (250 g × 1 and × 2). Qty added to cart is kg (`weight`).
 */
function buildSoldByWeightSizes(product) {
  const stepped = buildWeightStepSizes(product, { forceStep: true });
  if (stepped?.length) return stepped;
  return [];
}

/** @param {object | null | undefined} product */
export function buildAvailableSizes(product) {
  if (!product || typeof product !== 'object') return [];
  if (isSoldByWeight(product)) {
    const packs = buildSoldByWeightSizes(product);
    if (packs.length) return packs;
  }
  const weightSteps = buildWeightStepSizes(product);
  if (weightSteps?.length) return weightSteps;
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes;
  }
  if (product.weight && product.unit) {
    return [
      {
        packCount: 1,
        weight: product.weight,
        unit: product.unit,
        price: parseFloat(product.price) || 0,
      },
    ];
  }
  return [];
}

/**
 * Map user-selected size onto the latest `availableSizes` (fresh prices from refetch).
 * @param {Array<object>} availableSizes
 * @param {object | null | undefined} selectedSize
 */
export function resolveSelectedSize(availableSizes, selectedSize) {
  if (!Array.isArray(availableSizes) || availableSizes.length === 0) return null;
  if (!selectedSize) return availableSizes[0];
  const wantPack = packCountOf(selectedSize);
  const match = availableSizes.find(
    (s) =>
      packCountOf(s) === wantPack &&
      String(s.weight ?? '') === String(selectedSize.weight ?? '') &&
      String(s.unit ?? '') === String(selectedSize.unit ?? '')
  );
  return match ?? availableSizes[0];
}

export function sizePackCount(size) {
  return packCountOf(size);
}

/**
 * Quantity to add to cart for the selected chip.
 * Sold-by-weight: kg amount (`size.weight`). Packed / pack-step: pack count.
 */
export function sizeAddQuantity(product, size) {
  if (isSoldByWeight(product) && size?.weight != null) {
    const kg = Number(size.weight);
    if (Number.isFinite(kg) && kg > 0) {
      return Math.round(kg * 10000) / 10000;
    }
  }
  return packCountOf(size);
}
