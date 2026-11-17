/**
 * Basket rules the shop enforces before checkout.
 * The cart page asks the shop to price the basket, then stays put
 * until the minimum order, the coupon, and the products all pass.
 */

import type { CartItem } from "@/lib/cart-lines";

const PRODUCT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Same cap the shop uses on a checkout line. */
export const MAX_LINE_QUANTITY = 10;

const BASKET_CODES = new Set([
  "MIN_PURCHASE_NOT_MET",
  "PRODUCT_UNAVAILABLE",
  "PRODUCT_OUT_OF_STOCK",
  "INVALID_QUANTITY",
  "LINE_QUANTITY_CAP",
  "CART_EMPTY",
  "EMPTY_CART_WITH_COUPON",
  "MIN_SUBTOTAL_NOT_MET",
  "FIRST_ORDER_ONLY_NOT_MET",
  "NEW_CUSTOMER_ONLY_NOT_MET",
  "COUPON_NOT_FOUND",
  "COUPON_EXHAUSTED",
  "COUPON_NOT_APPLICABLE",
  "COUPON_NO_CART_BENEFIT",
  "COUPON_NOT_WITH_BUNDLE",
  "COUPON_NOT_AFTER_AUTO",
  "COUPON_NOT_WITH_SKU",
  "COUPON_NOT_WITH_AUTO_CART",
  "COUPON_NO_MATCHING_ITEMS",
  "COUPON_RULE_SUBTOTAL_NOT_MET",
]);

export type CheckoutLine = {
  productId: string;
  quantity: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function minor(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function rupees(amountMinor: number): string {
  const amount = amountMinor / 100;
  if (Number.isInteger(amount)) return `₹${amount.toLocaleString("en-IN")}`;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Shop lines only. Sample playground products are not sent to the shop. */
export function shopCheckoutLines(items: CartItem[]): CheckoutLine[] {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: item.weightKg && item.weightKg > 0 ? item.weightKg : item.qty,
    }))
    .filter((item) => PRODUCT_UUID.test(item.productId) && item.quantity > 0);
}

/** Rules we can see on the device, before asking the shop. */
export function localCheckoutWarning(lines: CheckoutLine[]): string | null {
  if (lines.some((line) => line.quantity > MAX_LINE_QUANTITY)) {
    return `Maximum quantity per line is ${MAX_LINE_QUANTITY}.`;
  }
  return null;
}

/**
 * Warnings from POST /api/storefront/cart/preview.
 * Empty means the basket may go to checkout.
 */
export function previewCheckoutWarning(
  preview: unknown,
  productIds: string[],
): string | null {
  const messages: string[] = [];
  const body = asRecord(preview);
  const summary = asRecord(body?.summary);
  const remaining = minor(summary?.min_purchase_remaining_minor);
  const minimum = minor(summary?.min_purchase_minor);
  if (remaining > 0 && minimum > 0) {
    messages.push(
      `Add ${rupees(remaining)} more to meet this shop's ${rupees(minimum)} minimum order.`,
    );
  }

  const coupon = asRecord(asRecord(body?.promotions)?.coupon);
  const reason =
    typeof coupon?.reason_message === "string" ? coupon.reason_message.trim() : "";
  if (coupon?.status === "not_applicable" && reason) messages.push(reason);

  const returned = new Set(
    (Array.isArray(body?.items) ? body.items : [])
      .map((item) => asRecord(item)?.product_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  if (productIds.some((id) => !returned.has(id))) {
    messages.push("One or more products are unavailable. Please refresh your cart.");
  }

  return messages.length > 0 ? messages.join(" ") : null;
}

/** Place-order failures that belong on the cart, not on the checkout page. */
export function isBasketCheckoutFailure(code: string, message: string): boolean {
  if (BASKET_CODES.has(code)) return true;
  return /minimum order|enough stock|unavailable|maximum quantity per line/i.test(message);
}
