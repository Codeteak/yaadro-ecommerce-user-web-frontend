/**
 * One bill math for order detail, ticket bill, receipt, and history total.
 * `order.subtotal` is item total before promo; Total = subtotal − promo + shipping.
 */

import type { SampleOrder } from "./sample-orders.ts";

/** Sample orders use a placeholder fee. Live orders use the shop's fee. */
export function deliveryCharge(order: SampleOrder): number {
  if (typeof order.deliveryFee === "number") return order.deliveryFee;
  return order.status === "cancelled" ? 0 : 25;
}

export function orderBillBreakdown(order: SampleOrder): {
  itemTotal: number;
  promo: number;
  shipping: number;
  total: number;
} {
  const itemTotal = Math.max(0, Math.round(order.subtotal));
  const promo = Math.max(0, Math.round(order.promoDiscount));
  const shipping = deliveryCharge(order);
  const total = Math.max(0, itemTotal - promo) + shipping;
  return { itemTotal, promo, shipping, total };
}

export function billedTotal(order: SampleOrder): number {
  return orderBillBreakdown(order).total;
}
