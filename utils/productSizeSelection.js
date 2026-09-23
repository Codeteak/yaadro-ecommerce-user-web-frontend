/**
 * Size/weight options for product cards and PDP.
 * Keeps selected variant in sync with live catalog price updates.
 *
 * Custom weight chips (step × 1 and × 2) only apply when the product is
 * sold-by-weight AND has a custom step (unit_size ≠ 1 kg). Packed products
 * without sold-by-weight must not invent 250 g / 500 g chips from unit_size.
 *
 * Catalog prices are per kg — gram-scale unit_size (e.g. 725) is normalized
 * before multiplying so listing never shows ₹165 × 725 = ₹119625.
 */

import {
  formatMassAmountLabel,
  formatWeightUnitLabel,
  getEffectivePrice,
  getListPrice,
  hasSoldByWeightFlag,
  massAmountInKg,
  parseProductUnitSize,
  resolveProductWeightAndUnit,
} from './productUtils.js';

/** Customer can buy step × 1 or × 2 only (e.g. 250 g → 250 g, 500 g). */
const WEIGHT_STEP_PACK_COUNTS = [1, 2];

function isSoldByWeight(product) {
  return hasSoldByWeightFlag(product);
}

export function isSoldByWeightProduct(product) {
  if (!product || typeof product !== 'object') return false;
  if (isSoldByWeight(product)) return true;
  if (product.product && isSoldByWeight(product.product)) return true;
  return false;
}

/**
 * Live pay/list for a weight-step chip (per-kg catalog × kg amount).
 * Never show the full kg price for a 250 g chip.
 */
export function weightStepLinePrices(product, size) {
  if (!product || !size?.weightStep) return null;
  const kg = Number(size.weight);
  if (!Number.isFinite(kg) || !(kg > 0)) return null;
  const listKg = getListPrice(product) || Number(product.price) || 0;
  const payKg = getEffectivePrice(product) || listKg;
  if (!Number.isFinite(payKg) || !(payKg > 0)) return null;
  return {
    list: Math.round(listKg * kg * 100) / 100,
    pay: Math.round(payKg * kg * 100) / 100,
  };
}

function resolveCatalogStepKg(product) {
  const { weight, unit } = resolveProductWeightAndUnit(product);
  // Prefer catalog unit_size (admin order step) over display weight fields.
  const raw = Number(
    parseProductUnitSize(product) ??
      product?.weightStepKg ??
      product?.product?.weightStepKg ??
      product?.product?.unit_size ??
      product?.product?.unitSize ??
      weight
  );
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const fromMass = massAmountInKg(raw, unit || 'kg');
  if (fromMass != null) return fromMass;
  // Non-mass or already kg-scale without recognized unit.
  if (raw > 20) return Math.round((raw / 1000) * 10000) / 10000;
  return Math.round(raw * 10000) / 10000;
}

/**
 * Admin-set custom order step for sold-by-weight (e.g. 0.25 kg).
 * Default catalog unit_size of 1 kg means "no custom step" — no multi chips.
 */
export function hasCustomWeightStep(product) {
  if (!isSoldByWeightProduct(product)) return false;
  const stepKg = resolveCatalogStepKg(product);
  if (stepKg == null || !(stepKg > 0)) return false;
  return Math.abs(stepKg - 1) >= 1e-9;
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
  const unit =
    productOrLine?.unit ||
    productOrLine?.base_unit ||
    productOrLine?.baseUnit ||
    productOrLine?.product?.unit ||
    productOrLine?.product?.base_unit ||
    'kg';
  for (const raw of candidates) {
    const n = Number(raw);
    if (!Number.isFinite(n) || !(n > 0)) continue;
    const kg = massAmountInKg(n, unit);
    if (kg != null && kg > 0) return kg;
    if (n > 20) return Math.round((n / 1000) * 10000) / 10000;
    return Math.round(n * 10000) / 10000;
  }
  return 0.25;
}

/**
 * kg sold in a custom step. Prices = kg amount × price per kg.
 * @param {object} product
 */
function buildCustomWeightStepSizes(product) {
  const stepKg = resolveCatalogStepKg(product);
  if (stepKg == null || !(stepKg > 0)) return null;
  // Refuse default 1 kg — that is not a custom step.
  if (Math.abs(stepKg - 1) < 1e-9) return null;

  const unitList = getListPrice(product) || parseFloat(product.price) || 0;
  const unitPay = getEffectivePrice(product, unitList) || unitList;
  if (!Number.isFinite(unitPay) || unitPay <= 0) return null;

  return WEIGHT_STEP_PACK_COUNTS.map((packCount) => {
    const amountKg = Math.round(stepKg * packCount * 10000) / 10000;
    const label =
      formatMassAmountLabel(amountKg, 'kg') || formatWeightUnitLabel(amountKg, 'kg');
    return {
      packCount,
      weight: amountKg,
      unit: 'kg',
      price: unitList * amountKg,
      payPrice: unitPay * amountKg,
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
 * Sold-by-weight with a custom admin step → 250 g / 500 g style chips.
 * Without a custom step → empty (card uses +/- in kg via cartQuantityStep).
 */
function buildSoldByWeightSizes(product) {
  if (!hasCustomWeightStep(product)) return [];
  const stepped = buildCustomWeightStepSizes(product);
  return stepped?.length ? stepped : [];
}

/** @param {object | null | undefined} product */
export function buildAvailableSizes(product) {
  if (!product || typeof product !== 'object') return [];
  // Custom weight chips only for sold-by-weight + custom unit_size step.
  if (isSoldByWeight(product)) {
    return buildSoldByWeightSizes(product);
  }
  // Packed / normal products: never invent weight-step chips from unit_size.
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
      // Chip weights are stored in kg; still guard gram-scale leftovers.
      const normalized = massAmountInKg(kg, size.unit || 'kg');
      return normalized != null ? normalized : Math.round(kg * 10000) / 10000;
    }
  }
  // Sold-by-weight without chips: add one step of kg (custom or default 0.25).
  if (isSoldByWeight(product) && !size) {
    return cartQuantityStep(product);
  }
  return packCountOf(size);
}
