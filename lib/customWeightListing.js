/**
 * Display price for one custom sold-by-weight step.
 * Catalog price stays per kg. Checkout still bills price per kg × kilograms.
 * This only labels the listing (250 g of a ₹250/kg apple → ₹62.50).
 */

import {
  formatMassAmountLabel,
  hasSoldByWeightFlag,
  massAmountInKg,
} from '../utils/productUtils.js';

function toMinor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * @param {Record<string, unknown> | null | undefined} product
 * @returns {null | {
 *   custom_weight_label: string,
 *   custom_weight_price_minor: string,
 *   custom_weight_list_price_minor?: string,
 * }}
 */
export function customWeightListingFields(product) {
  if (!hasSoldByWeightFlag(product)) return null;

  const rawSize = product.unit_size ?? product.unitSize;
  const unit = product.base_unit ?? product.baseUnit ?? product.unit ?? 'kg';
  const stepKg = massAmountInKg(rawSize, unit || 'kg');
  if (stepKg == null || !(stepKg > 0) || Math.abs(stepKg - 1) < 1e-9) return null;

  const finalMinor = toMinor(
    product.final_price_minor ??
      product.finalPriceMinor ??
      product.price_minor_per_unit ??
      product.priceMinorPerUnit
  );
  if (!(finalMinor > 0)) return null;

  const listMinor = toMinor(
    product.actual_price_minor ??
      product.actualPriceMinor ??
      product.price_minor_per_unit ??
      product.priceMinorPerUnit
  );
  const payMinor = Math.round(finalMinor * stepKg);
  const listStepMinor = Math.round((listMinor > 0 ? listMinor : finalMinor) * stepKg);
  const label = formatMassAmountLabel(stepKg, 'kg');
  if (!label || !(payMinor > 0)) return null;

  const fields = {
    custom_weight_label: label,
    custom_weight_price_minor: String(payMinor),
  };
  if (listStepMinor > payMinor) {
    fields.custom_weight_list_price_minor = String(listStepMinor);
  }
  return fields;
}

/** Rupees for `multiplier` catalog steps. ×1 is the server step price; ×2 is that price times 2. */
export function customWeightStepRupees(product, multiplier = 1) {
  if (!product || typeof product !== 'object') return null;
  const raw = product.customWeightPriceMinor ?? product.custom_weight_price_minor;
  const minor = Number(raw);
  if (!Number.isFinite(minor) || !(minor > 0)) return null;
  const factor = Number(multiplier);
  const steps = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return Math.round(minor * steps) / 100;
}

/** Struck list price for `multiplier` steps, when the shop price is higher than the payable step. */
export function customWeightListRupees(product, multiplier = 1) {
  if (!product || typeof product !== 'object') return null;
  const raw = product.customWeightListPriceMinor ?? product.custom_weight_list_price_minor;
  const minor = Number(raw);
  if (!Number.isFinite(minor) || !(minor > 0)) return null;
  const factor = Number(multiplier);
  const steps = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return Math.round(minor * steps) / 100;
}
