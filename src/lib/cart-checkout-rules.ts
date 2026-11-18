/**
 * Basket rules the shop enforces before checkout.
 * The cart page asks the shop to price the basket, then stays put
 * until the minimum order, the coupon, and the products all pass.
 */

import type { CartItem } from "./cart-lines.ts";

const PRODUCT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Same cap the shop uses on a pack (non-weight) checkout line. */
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

/** Catalog unit_size / stepKg from the cart snapshot (set when the line was added). */
function weightStepKg(item: CartItem): number {
  const step = item.snapshot?.customization?.stepKg;
  return typeof step === "number" && step > 0 ? step : 1;
}

function weightMaxKg(item: CartItem): number {
  const max = item.snapshot?.customization?.maxKg;
  return typeof max === "number" && max > 0 ? max : 10;
}

/**
 * Quantity for cart preview / place order.
 * Catalog price is per `unit_size` (stepKg), so weight lines send
 * unit count: kg / stepKg (e.g. 3.1 kg ÷ 0.1 = 31), not raw kg.
 */
export function shopLineQuantity(item: CartItem): number {
  if (item.weightKg && item.weightKg > 0) {
    const step = weightStepKg(item);
    return Math.round((item.weightKg / step) * 1000) / 1000;
  }
  return item.qty;
}

/** Shop lines only. Sample playground products are not sent to the shop. */
export function shopCheckoutLines(items: CartItem[]): CheckoutLine[] {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: shopLineQuantity(item),
    }))
    .filter((item) => PRODUCT_UUID.test(item.productId) && item.quantity > 0);
}

/** Rules we can see on the device, before asking the shop. */
export function localCheckoutWarning(items: CartItem[]): string | null {
  for (const item of items) {
    if (!PRODUCT_UUID.test(item.productId)) continue;
    if (item.weightKg && item.weightKg > 0) {
      const maxKg = weightMaxKg(item);
      if (item.weightKg > maxKg) {
        return `Maximum weight per line is ${maxKg} kg.`;
      }
      continue;
    }
    if (item.qty > MAX_LINE_QUANTITY) {
      return `Maximum quantity per line is ${MAX_LINE_QUANTITY}.`;
    }
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

export type ShopOffer = {
  label: string;
  categoryId: string | null;
  reached: boolean;
};

export type ShopQuote = {
  /** Null once the basket meets the shop minimum. */
  minimumMessage: string | null;
  /**
   * Shop payable total in rupees. Present even when the shop says 0.
   * Null when the preview did not include a subtotal.
   */
  totalRupees: number | null;
  applied: ShopOffer[];
  suggested: ShopOffer[];
};

const EMPTY_QUOTE: ShopQuote = {
  minimumMessage: null,
  totalRupees: null,
  applied: [],
  suggested: [],
};

/** Ask open cart and checkout pages to price the basket again. */
export const SHOP_QUOTE_EVENT = "yaadro-shop-quote";

function presentMinor(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function offerLabel(row: Record<string, unknown>): string {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (title) return title;
  const message = typeof row.message === "string" ? row.message.trim() : "";
  if (message) return message;
  const name = typeof row.category_name === "string" ? row.category_name.trim() : "";
  const bps = Number(row.percent_bps);
  const percent = Number.isFinite(bps) && bps > 0 ? bps / 100 : null;
  const percentLabel =
    percent == null ? null : Number.isInteger(percent) ? `${percent}%` : `${percent}%`;
  if (name && percentLabel) return `${percentLabel} off ${name}`;
  if (percentLabel) return `${percentLabel} off this basket`;
  if (name) return name;
  return "Shop offer";
}

function offerList(value: unknown, reached: boolean): ShopOffer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const categoryId = typeof row.category_id === "string" ? row.category_id : null;
    return [{ label: offerLabel(row), categoryId, reached }];
  });
}

/** Minimum, trusted total, and automatic offers from a cart preview. */
export function parseShopQuote(preview: unknown): ShopQuote {
  const body = asRecord(preview);
  if (!body) return EMPTY_QUOTE;
  const summary = asRecord(body.summary);
  const remaining = presentMinor(summary?.min_purchase_remaining_minor);
  const minimum = presentMinor(summary?.min_purchase_minor);
  const subtotal = presentMinor(summary?.subtotal_minor);
  const auto = asRecord(asRecord(body.promotions)?.auto);
  return {
    minimumMessage:
      remaining != null && minimum != null && remaining > 0 && minimum > 0
        ? `Add ${rupees(remaining)} more to meet this shop's ${rupees(minimum)} minimum order.`
        : null,
    totalRupees: subtotal == null ? null : subtotal / 100,
    applied: offerList(auto?.applied_offers, true),
    suggested: offerList(auto?.suggested_offers, false),
  };
}

export function formatRupees(amount: number): string {
  if (Number.isInteger(amount)) return `₹${amount.toLocaleString("en-IN")}`;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Place-order failures that belong on the cart, not on the checkout page. */
export function isBasketCheckoutFailure(code: string, message: string): boolean {
  if (BASKET_CODES.has(code)) return true;
  return /minimum order|enough stock|unavailable|maximum quantity per line/i.test(message);
}
