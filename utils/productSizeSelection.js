/**
 * Size/weight options for product cards and PDP.
 * Keeps selected variant in sync with live catalog price updates.
 */

import {
  formatWeightUnitLabel,
  getEffectivePrice,
  getListPrice,
  resolveProductWeightAndUnit,
} from './productUtils';

function isSoldByWeight(product) {
  return product?.soldByWeight === true || product?.sold_by_weight === true;
}

function packCountOf(size) {
  const n = Number(size?.packCount);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * When catalog `sold_by_weight` is true: 1× and 2× of the original pack.
 * Same SKU; prices are packCount × unit price. Weight stays the base pack.
 */
function buildSoldByWeightSizes(product) {
  const { weight, unit } = resolveProductWeightAndUnit(product);
  const unitList = getListPrice(product) || parseFloat(product.price) || 0;
  const unitPay = getEffectivePrice(product, unitList) || unitList;
  if (!Number.isFinite(unitPay) || unitPay <= 0) return [];

  const baseLabel = formatWeightUnitLabel(weight, unit) || '1 pack';
  return [1, 2].map((packCount) => ({
    packCount,
    weight,
    unit,
    price: unitList * packCount,
    payPrice: unitPay * packCount,
    label: packCount === 1 ? baseLabel : `2 × ${baseLabel}`,
  }));
}

/** @param {object | null | undefined} product */
export function buildAvailableSizes(product) {
  if (!product || typeof product !== 'object') return [];
  if (isSoldByWeight(product)) {
    const packs = buildSoldByWeightSizes(product);
    if (packs.length) return packs;
  }
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
