/**
 * Single source of truth for catalog list vs offer pay (cart + orders).
 *
 * Contract:
 * - list  = MRP / tag price (strike)
 * - pay   = catalog offer when offer < list (what customer pays)
 * - off   = (list − pay) × paidQty
 *
 * Never treat list-as-offer (snapshot 215/180) as a real discount.
 * Cap runaway MRP candidates (e.g. sticky selectedSize ₹1023).
 */

import { minorToMajor, parseMinorInt } from './currencyMinor';

const EPS = 0.004;

export function parseMajorMoney(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isPayBelowList(pay, list) {
  return (
    pay != null &&
    Number.isFinite(pay) &&
    pay > 0 &&
    (list == null || !(list > 0) || pay < list - EPS)
  );
}

/**
 * Pick max list among candidates, dropping values > 2× median/min band.
 * @param {Array<number|null|undefined>} candidates
 * @returns {number|null}
 */
export function pickSaneListUnit(candidates) {
  const values = [];
  for (const raw of candidates || []) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    values.push(n);
  }
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const floor = sorted[0];
  const mid = sorted[Math.floor((sorted.length - 1) / 2)];
  const saneCap = Math.max(floor, mid) * 2;
  let best = null;
  for (const n of values) {
    if (n > saneCap + 1e-9) continue;
    if (best == null || n > best) best = n;
  }
  return best != null ? best : mid;
}

/**
 * Prefer the lowest trusted pay that is under list (catalog offer wins over list-as-pay).
 * @param {Array<number|null|undefined>} payCandidates
 * @param {number|null} listUnit
 * @returns {number|null}
 */
export function pickCatalogPayUnit(payCandidates, listUnit) {
  let best = null;
  for (const raw of payCandidates || []) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!isPayBelowList(n, listUnit)) continue;
    if (best == null || n < best) best = n;
  }
  return best;
}

/**
 * OFF / Saved = (list − pay) × paidQty. Ignores runaway lineDiscount.
 */
export function catalogOfferSavingsMajor(listUnit, payUnit, paidQty = 1) {
  const list = Number(listUnit);
  const pay = Number(payUnit);
  const qty = Number(paidQty);
  if (!(list > 0) || !(pay >= 0) || !(qty > 0)) return 0;
  if (!(list > pay + EPS)) return 0;
  return (list - pay) * qty;
}

/**
 * Resolve list + pay for a product-like or cart/order line-like object.
 * Prefers nested product.offerPrice when product id is trusted (or alwaysProduct).
 *
 * @param {object} item
 * @param {{
 *   trustProduct?: boolean,
 *   paidQty?: number,
 *   lineTotal?: number|null,
 *   unitPriceRaw?: number|null,
 *   listPriceMinor?: number,
 * }} [opts]
 * @returns {{ listUnit: number|null, payUnit: number|null, savingsUnit: number, hasOffer: boolean }}
 */
export function resolveCatalogListAndPay(item, opts = {}) {
  if (!item || typeof item !== 'object') {
    return { listUnit: null, payUnit: null, savingsUnit: 0, hasOffer: false };
  }

  const trustProduct = opts.trustProduct !== false;
  const product = item.product && typeof item.product === 'object' ? item.product : null;
  const useProduct = trustProduct && product;

  const listMinor = parseMinorInt(
    opts.listPriceMinor ??
      item.list_price_minor ??
      item.listPriceMinor ??
      item.actual_price_minor ??
      item.actualPriceMinor,
  );

  const listUnit = pickSaneListUnit([
    listMinor > 0 ? minorToMajor(listMinor) : null,
    parseMajorMoney(item.listPrice ?? item.list_price),
    parseMajorMoney(item.mrp),
    parseMajorMoney(item.originalPrice ?? item.original_price),
    parseMajorMoney(item.compareAtPrice ?? item.compare_at_price),
    parseMajorMoney(item.actualPrice),
    useProduct
      ? parseMajorMoney(
          product.originalPrice ??
            product.listPrice ??
            product.list_price ??
            product.mrp ??
            product.compareAtPrice ??
            product.price,
        )
      : null,
    useProduct && Number(product.actualPriceMinor) > 0
      ? Number(product.actualPriceMinor) / 100
      : null,
    parseMajorMoney(item.selectedSize?.originalPrice),
    parseMajorMoney(item.selectedSize?.mrp),
    // selectedSize.price only if near other list candidates (handled by pickSaneListUnit)
    parseMajorMoney(item.selectedSize?.price),
    opts.unitPriceRaw != null && Number(opts.unitPriceRaw) > 0
      ? Number(opts.unitPriceRaw)
      : null,
  ]);

  const paidQty =
    opts.paidQty != null && Number(opts.paidQty) > 0 ? Number(opts.paidQty) : 1;
  const lineTotal =
    opts.lineTotal != null && Number.isFinite(Number(opts.lineTotal))
      ? Number(opts.lineTotal)
      : null;

  const offerMinor = parseMinorInt(
    item.offer_price_minor_per_unit ??
      item.offerPriceMinorPerUnit ??
      item.offer_price_minor ??
      item.offerPriceMinor ??
      item.final_price_minor ??
      item.finalPriceMinor ??
      item.pricing?.offer_minor ??
      item.pricing?.final_minor,
  );

  const payUnit = pickCatalogPayUnit(
    [
      useProduct
        ? parseMajorMoney(
            product.offerPrice ??
              product.offerPriceEffective ??
              product.offer_price,
          )
        : null,
      useProduct && Number(product.finalPriceMinor) > 0
        ? Number(product.finalPriceMinor) / 100
        : null,
      lineTotal != null && paidQty > 0 ? lineTotal / paidQty : null,
      offerMinor > 0 ? minorToMajor(offerMinor) : null,
      parseMajorMoney(
        item.offerPrice ?? item.offer_price ?? item.offerPriceEffective,
      ),
      parseMajorMoney(item.price),
      opts.unitPriceRaw != null ? Number(opts.unitPriceRaw) : null,
    ],
    listUnit,
  );

  const hasOffer =
    payUnit != null &&
    listUnit != null &&
    listUnit > payUnit + EPS;

  return {
    listUnit,
    payUnit,
    savingsUnit: hasOffer ? listUnit - payUnit : 0,
    hasOffer,
  };
}

/**
 * Choose sell unit for cart preview merge: min of local/preview when both under list.
 */
export function pickMergedSellUnderList(localPay, previewPay, listUnit) {
  const localOk = isPayBelowList(localPay, listUnit);
  const previewOk = isPayBelowList(previewPay, listUnit);
  if (localOk && previewOk) return Math.min(Number(localPay), Number(previewPay));
  if (localOk) return Number(localPay);
  if (previewOk) return Number(previewPay);
  if (listUnit != null && Number.isFinite(listUnit) && listUnit > 0) return listUnit;
  return null;
}

/**
 * True when a snapshot "offer" is real (below list), not list copied into offer fields.
 */
export function hasMeaningfulCatalogOfferOnRaw(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const { listUnit, payUnit, hasOffer } = resolveCatalogListAndPay(raw, {
    trustProduct: true,
  });
  return hasOffer && payUnit != null && listUnit != null;
}
