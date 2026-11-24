"use client";

import { useMemo } from "react";
import type { ShopQuote } from "@/lib/cart-checkout-rules";
import { buildCartBill, type CartBillModel } from "@/lib/cart-bill";

/**
 * Shared bill model for cart and checkout.
 */
export function useCartBill(input: {
  itemCount: number;
  mrpTotal: number;
  subtotal: number;
  localCoupon: { code: string; discountRupees: number } | null;
  quote: ShopQuote | null;
}): CartBillModel {
  const { itemCount, mrpTotal, subtotal, localCoupon, quote } = input;
  return useMemo(
    () =>
      buildCartBill({
        itemCount,
        mrpTotal,
        subtotal,
        localCoupon,
        quote,
      }),
    [itemCount, mrpTotal, subtotal, localCoupon, quote],
  );
}
