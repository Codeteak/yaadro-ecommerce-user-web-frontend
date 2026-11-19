/**
 * Production coupon apply — the shop prices the basket via cart preview.
 * Playground keeps local `applyCartPromo` / SAMPLE_COUPONS.
 */

import { previewCart } from "@/lib/api/cart";
import {
  parseShopQuote,
  shopCheckoutLines,
  type CheckoutLine,
} from "@/lib/cart-checkout-rules";
import type { CartItem } from "@/lib/cart-lines";
import type { SampleCoupon } from "@/lib/sample-coupons";
import { ApiError } from "@/lib/api/errors";

/** Minimal stored coupon so the cart keeps the code for later previews. */
export function couponStubFromCode(
  code: string,
  known?: SampleCoupon | null,
): SampleCoupon {
  const trimmed = code.trim();
  if (known && known.code.toUpperCase() === trimmed.toUpperCase()) {
    return known;
  }
  return {
    id: `shop-${trimmed.toUpperCase()}`,
    title: trimmed.toUpperCase(),
    subtitle: "Shop coupon",
    code: trimmed.toUpperCase(),
    status: "active",
    section: "Available",
    issuedLabel: "",
    discountLabel: "Shop discount",
    minOrderLabel: "Confirmed by shop",
    validUntilLabel: "",
    terms: ["The shop confirms the discount on cart preview and checkout."],
    minOrder: 0,
    // Local discount unused on live — bill uses preview coupon_discount_minor.
    discount: { type: "flat", amount: 0 },
  };
}

export type ShopPromoResult =
  | { ok: true; code: string; discountRupees: number; message: string; coupon: SampleCoupon }
  | { ok: false; message: string };

/**
 * Ask the shop whether `code` discounts these lines.
 * Only succeeds when preview status is `applied` with a positive discount.
 */
export async function confirmShopPromo(
  code: string,
  items: CartItem[],
  known?: SampleCoupon | null,
  signal?: AbortSignal,
): Promise<ShopPromoResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a promo code" };
  }
  const lines: CheckoutLine[] = shopCheckoutLines(items);
  if (lines.length === 0) {
    return {
      ok: false,
      message: "Add products from this shop before applying a coupon.",
    };
  }
  try {
    const preview = await previewCart(
      {
        items: lines,
        couponCode: trimmed,
        includeSuggestedCoupons: false,
      },
      signal,
    );
    const quote = parseShopQuote(preview);
    if (quote.coupon.status === "applied" && quote.coupon.discountRupees > 0) {
      const coupon = couponStubFromCode(
        quote.coupon.code ?? trimmed,
        known,
      );
      const amount = Math.round(quote.coupon.discountRupees);
      return {
        ok: true,
        code: coupon.code,
        discountRupees: quote.coupon.discountRupees,
        message: `Applied ${coupon.code} — you save ₹${amount}`,
        coupon,
      };
    }
    return {
      ok: false,
      message:
        quote.coupon.reasonMessage?.trim() ||
        "This coupon can't be applied to this basket.",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, message: "Cancelled" };
    }
    if (error instanceof ApiError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "We couldn't check this coupon. Try again.",
    };
  }
}
