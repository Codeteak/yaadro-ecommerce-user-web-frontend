/**
 * Builds the cart / checkout bill from shop preview when available,
 * otherwise from on-device totals. Rows always add up to `toPay`.
 */

import type { ShopQuote } from "./cart-checkout-rules.ts";

export type CartBillOfferRow = {
  label: string;
  categoryId: string | null;
  discountRupees: number;
};

export type CartBillModel = {
  itemCount: number;
  /** Catalog MRP sum for the basket (phone). */
  mrpTotal: number;
  /** Product/list savings so rows reach toPay. */
  productDiscount: number;
  offers: CartBillOfferRow[];
  coupon: { code: string; discountRupees: number } | null;
  toPay: number;
  /** MRP − toPay (everything the shopper saved). */
  saved: number;
  minimumMessage: string | null;
  fromShop: boolean;
};

export type CartBillInput = {
  itemCount: number;
  mrpTotal: number;
  /** Local selling subtotal (phone). */
  subtotal: number;
  /** Local sample coupon (playground) or stub while shop loads. */
  localCoupon: { code: string; discountRupees: number } | null;
  quote: ShopQuote | null;
};

/**
 * Prefer shop numbers. `productDiscount` absorbs rounding so:
 * mrpTotal − productDiscount − offers − coupon = toPay.
 */
export function buildCartBill(input: CartBillInput): CartBillModel {
  const { itemCount, mrpTotal, subtotal, localCoupon, quote } = input;

  if (quote?.totalRupees != null) {
    const toPay = Math.max(0, Math.round(quote.totalRupees * 100) / 100);
    const offers: CartBillOfferRow[] = quote.applied
      .filter((offer) => offer.discountRupees > 0)
      .map((offer) => ({
        label: offer.label,
        categoryId: offer.categoryId,
        discountRupees: Math.round(offer.discountRupees * 100) / 100,
      }));
    // If applied offers have no ₹, fold auto + bundle into one row.
    if (offers.length === 0) {
      const auto =
        Math.round(
          (quote.autoCartDiscountRupees + quote.bundleDiscountRupees) * 100,
        ) / 100;
      if (auto > 0) {
        offers.push({
          label: "Shop offer",
          categoryId: null,
          discountRupees: auto,
        });
      }
    }
    const offerTotal = offers.reduce((sum, row) => sum + row.discountRupees, 0);
    const coupon =
      quote.coupon.status === "applied" && quote.coupon.discountRupees > 0
        ? {
            code: quote.coupon.code?.trim() || localCoupon?.code || "Coupon",
            discountRupees:
              Math.round(quote.coupon.discountRupees * 100) / 100,
          }
        : null;
    const couponAmt = coupon?.discountRupees ?? 0;
    const productDiscount = Math.max(
      0,
      Math.round((mrpTotal - toPay - offerTotal - couponAmt) * 100) / 100,
    );
    const saved = Math.max(0, Math.round((mrpTotal - toPay) * 100) / 100);
    return {
      itemCount,
      mrpTotal,
      productDiscount,
      offers,
      coupon,
      toPay,
      saved,
      minimumMessage: quote.minimumMessage,
      fromShop: true,
    };
  }

  const couponAmt = localCoupon?.discountRupees ?? 0;
  const toPay = Math.max(0, Math.round((subtotal - couponAmt) * 100) / 100);
  const productDiscount = Math.max(
    0,
    Math.round((mrpTotal - subtotal) * 100) / 100,
  );
  return {
    itemCount,
    mrpTotal,
    productDiscount,
    offers: [],
    coupon:
      localCoupon && couponAmt > 0
        ? {
            code: localCoupon.code,
            discountRupees: Math.round(couponAmt * 100) / 100,
          }
        : null,
    toPay,
    saved: Math.max(0, Math.round((mrpTotal - toPay) * 100) / 100),
    minimumMessage: null,
    fromShop: false,
  };
}
