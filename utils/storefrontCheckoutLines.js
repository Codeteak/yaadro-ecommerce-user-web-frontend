/**
 * Build place-order line payloads from local cart rows.
 * Sold-by-weight lines keep fractional kg qty (never ceil to 1).
 */

import {
  getCartLinePaidQty,
  isBundleRewardCartLine,
} from './cartPromotions.js';

/**
 * @param {unknown[]} cartItems
 * @returns {{ productId: string, quantity: number }[]}
 */
export function buildCheckoutLinesFromCartItems(cartItems) {
  /** @type {Map<string, number>} */
  const byProduct = new Map();
  for (const it of Array.isArray(cartItems) ? cartItems : []) {
    if (isBundleRewardCartLine(it)) continue;
    const productId = String(
      it?.productId ?? it?.product_id ?? it?.product?.id ?? ''
    ).trim();
    if (!productId) continue;
    const rawQty = Number(getCartLinePaidQty(it));
    const qty =
      Number.isFinite(rawQty) && rawQty > 0
        ? Math.round(rawQty * 10000) / 10000
        : 0;
    if (!(qty > 0)) continue;
    byProduct.set(productId, (byProduct.get(productId) || 0) + qty);
  }
  return [...byProduct.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((it) => it.productId && it.quantity > 0);
}
