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
  // Cap promo at items so a bad mapped discount cannot zero the bill wrongly.
  const promo = Math.min(
    Math.max(0, Math.round(order.promoDiscount)),
    itemTotal,
  );
  const shipping = deliveryCharge(order);
  const derived = Math.max(0, itemTotal - promo) + shipping;
  // Prefer shop total when it matches Item − Promo + Shipping (±₹1).
  const apiTotal =
    typeof order.totalDue === "number" && Number.isFinite(order.totalDue)
      ? Math.max(0, Math.round(order.totalDue))
      : null;
  const total =
    apiTotal != null && Math.abs(apiTotal - derived) <= 1 ? apiTotal : derived;
  return { itemTotal, promo, shipping, total };
}

export function billedTotal(order: SampleOrder): number {
  return orderBillBreakdown(order).total;
}
