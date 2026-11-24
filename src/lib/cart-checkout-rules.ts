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

function weightMaxKg(item: CartItem): number {
  const max = item.snapshot?.customization?.maxKg;
  return typeof max === "number" && max > 0 ? max : 10;
}

/**
 * Quantity for cart preview / place order.
 * Sold-by-weight lines send kilograms. The shop prices per kg with
 * unit_size as the order step only — do not convert to step counts.
 */
export function shopLineQuantity(item: CartItem): number {
  if (item.weightKg && item.weightKg > 0) {
    return Math.round(item.weightKg * 10_000) / 10_000;
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
  /** Rupees from `discount_minor` / `amount_minor` when the shop sends them. */
  discountRupees: number;
};

export type ShopCouponQuote = {
  code: string | null;
  status: "none" | "applied" | "not_applicable" | "unknown";
  /** Whole rupees from `coupon_discount_minor`. */
  discountRupees: number;
  reasonMessage: string | null;
};

/** One priced line from cart preview (paid or free bundle reward). */
export type ShopQuoteLine = {
  productId: string | null;
  title: string | null;
  imageUrl: string | null;
  quantity: number;
  offerQuantity: number;
  isBundleReward: boolean;
  /** Per-unit MRP (rupees). */
  listRupees: number | null;
  /** Per-unit final (rupees). */
  finalRupees: number | null;
  /** Line payable total (rupees). */
  lineTotalRupees: number | null;
};

export type ShopQuote = {
  /** Null once the basket meets the shop minimum. */
  minimumMessage: string | null;
  /**
   * Shop payable total in rupees. Present even when the shop says 0.
   * Null when the preview did not include a subtotal.
   */
  totalRupees: number | null;
  /** Summary discount fields (rupees). */
  linePromoDiscountRupees: number;
  bundleDiscountRupees: number;
  autoCartDiscountRupees: number;
  coupon: ShopCouponQuote;
  applied: ShopOffer[];
  suggested: ShopOffer[];
  /** Paid + free lines from the preview. */
  lines: ShopQuoteLine[];
  /** Bundle reward / free gift lines only. */
  freeItems: ShopQuoteLine[];
};

const EMPTY_COUPON: ShopCouponQuote = {
  code: null,
  status: "none",
  discountRupees: 0,
  reasonMessage: null,
};

const EMPTY_QUOTE: ShopQuote = {
  minimumMessage: null,
  totalRupees: null,
  linePromoDiscountRupees: 0,
  bundleDiscountRupees: 0,
  autoCartDiscountRupees: 0,
  coupon: EMPTY_COUPON,
  applied: [],
  suggested: [],
  lines: [],
  freeItems: [],
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
  const name =
    typeof row.category_name === "string"
      ? row.category_name.trim()
      : typeof row.categoryName === "string"
        ? row.categoryName.trim()
        : "";
  const bps = Number(row.percent_bps ?? row.percentBps);
  const percent = Number.isFinite(bps) && bps > 0 ? bps / 100 : null;
  const percentLabel =
    percent == null ? null : Number.isInteger(percent) ? `${percent}%` : `${percent}%`;
  if (name && percentLabel) return `${percentLabel} off ${name}`;
  if (percentLabel) return `${percentLabel} off this basket`;
  if (name) return name;
  return "Shop offer";
}

function offerDiscountRupees(row: Record<string, unknown>): number {
  const discount = presentMinor(row.discount_minor ?? row.discountMinor);
  const amount = presentMinor(row.amount_minor ?? row.amountMinor);
  const minorValue = discount ?? amount ?? 0;
  return minorValue / 100;
}

function offerList(value: unknown, reached: boolean): ShopOffer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const categoryId =
      typeof row.category_id === "string"
        ? row.category_id
        : typeof row.categoryId === "string"
          ? row.categoryId
          : null;
    return [
      {
        label: offerLabel(row),
        categoryId,
        reached,
        discountRupees: offerDiscountRupees(row),
      },
    ];
  });
}

function parseQuoteLine(value: unknown): ShopQuoteLine | null {
  const row = asRecord(value);
  if (!row) return null;
  const pricing = asRecord(row.pricing);
  const productId =
    typeof row.product_id === "string"
      ? row.product_id
      : typeof row.productId === "string"
        ? row.productId
        : null;
  const listMinor = presentMinor(pricing?.list_minor ?? pricing?.listMinor);
  const finalMinor = presentMinor(pricing?.final_minor ?? pricing?.finalMinor);
  const lineTotalMinor = presentMinor(
    pricing?.line_total_minor ?? pricing?.lineTotalMinor,
  );
  const quantity = Number(row.quantity ?? 0);
  const offerQuantity = Number(row.offer_quantity ?? row.offerQuantity ?? 0);
  const isBundleReward =
    row.is_bundle_reward === true ||
    row.isBundleReward === true ||
    String(row.id ?? "").startsWith("inject:");
  return {
    productId,
    title:
      typeof row.title === "string"
        ? row.title
        : typeof row.title_snapshot === "string"
          ? row.title_snapshot
          : null,
    imageUrl:
      typeof row.image_url === "string"
        ? row.image_url
        : typeof row.imageUrl === "string"
          ? row.imageUrl
          : null,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    offerQuantity: Number.isFinite(offerQuantity) ? offerQuantity : 0,
    isBundleReward,
    listRupees: listMinor == null ? null : listMinor / 100,
    finalRupees: finalMinor == null ? null : finalMinor / 100,
    lineTotalRupees: lineTotalMinor == null ? null : lineTotalMinor / 100,
  };
}

function parseShopCoupon(preview: Record<string, unknown> | null): ShopCouponQuote {
  const summary = asRecord(preview?.summary);
  const coupon = asRecord(asRecord(preview?.promotions)?.coupon);
  const fromSummary = presentMinor(summary?.coupon_discount_minor);
  const fromCoupon = presentMinor(coupon?.discount_minor);
  const discountMinor = fromSummary ?? fromCoupon ?? 0;
  const rawStatus = typeof coupon?.status === "string" ? coupon.status : "";
  const status: ShopCouponQuote["status"] =
    rawStatus === "applied" || rawStatus === "not_applicable" || rawStatus === "none"
      ? rawStatus
      : coupon
        ? "unknown"
        : "none";
  const code =
    typeof coupon?.code === "string" && coupon.code.trim()
      ? coupon.code.trim()
      : null;
  const reasonMessage =
    typeof coupon?.reason_message === "string" && coupon.reason_message.trim()
      ? coupon.reason_message.trim()
      : null;
  return {
    code,
    status,
    discountRupees: discountMinor / 100,
    reasonMessage,
  };
}

/**
 * Bill row for a coupon.
 * `shop` = only when preview applied a discount (production).
 * `sample` = local promo math (playground).
 */
export function billCouponLine(
  mode: "shop" | "sample",
  quote: ShopQuote | null,
  local: { code: string; discountRupees: number } | null,
): { code: string; discountRupees: number } | null {
  if (mode === "shop") {
    if (!quote || quote.coupon.status !== "applied") return null;
    if (quote.coupon.discountRupees <= 0) return null;
    const code = quote.coupon.code?.trim() || local?.code?.trim() || "Coupon";
    return { code, discountRupees: quote.coupon.discountRupees };
  }
  if (!local || local.discountRupees <= 0 || !local.code.trim()) return null;
  return { code: local.code.trim(), discountRupees: local.discountRupees };
}

/** Minimum, trusted total, coupon, lines, and automatic offers from a cart preview. */
export function parseShopQuote(preview: unknown): ShopQuote {
  const body = asRecord(preview);
  if (!body) return EMPTY_QUOTE;
  const summary = asRecord(body.summary);
  const remaining = presentMinor(summary?.min_purchase_remaining_minor);
  const minimum = presentMinor(summary?.min_purchase_minor);
  const subtotal = presentMinor(summary?.subtotal_minor);
  const auto = asRecord(asRecord(body.promotions)?.auto);
  const lines = (Array.isArray(body.items) ? body.items : [])
    .map(parseQuoteLine)
    .filter((line): line is ShopQuoteLine => Boolean(line));
  const freeItems = lines.filter((line) => line.isBundleReward);
  return {
    minimumMessage:
      remaining != null && minimum != null && remaining > 0 && minimum > 0
        ? `Add ${rupees(remaining)} more to meet this shop's ${rupees(minimum)} minimum order.`
        : null,
    totalRupees: subtotal == null ? null : subtotal / 100,
    linePromoDiscountRupees:
      (presentMinor(summary?.line_promo_discount_minor) ?? 0) / 100,
    bundleDiscountRupees:
      (presentMinor(summary?.bundle_discount_minor) ?? 0) / 100,
    autoCartDiscountRupees:
      (presentMinor(summary?.auto_cart_discount_minor) ?? 0) / 100,
    coupon: parseShopCoupon(body),
    applied: offerList(auto?.applied_offers, true),
    suggested: offerList(auto?.suggested_offers, false),
    lines,
    freeItems,
  };
}

/** Stable key for basket + coupon — shared by quote cache and checkout reuse. */
export function shopQuoteBasketKey(
  items: CartItem[],
  couponCode: string | null,
): string {
  const lines = shopCheckoutLines(items);
  return `${lines.map((line) => `${line.productId}:${line.quantity}`).join("|")}|${couponCode ?? ""}`;
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
