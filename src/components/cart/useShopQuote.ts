"use client";

import { useEffect, useState } from "react";
import { previewCart } from "@/lib/api/cart";
import type { CartItem } from "@/lib/cart-lines";
import {
  parseShopQuote,
  previewCheckoutWarning,
  shopCheckoutLines,
  SHOP_QUOTE_EVENT,
  type ShopQuote,
} from "@/lib/cart-checkout-rules";

const PREVIEW_DEBOUNCE_MS = 280;

function lineKey(items: CartItem[], couponCode: string | null): string {
  const lines = shopCheckoutLines(items);
  return `${lines.map((line) => `${line.productId}:${line.quantity}`).join("|")}|${couponCode ?? ""}`;
}

export type ShopQuoteState = ShopQuote & {
  /** From the same preview — cart can skip a second POST on Checkout. */
  checkoutWarning: string | null;
};

/**
 * Prices the on-device basket with the shop (debounced).
 * A failed preview leaves `failed` set so the Checkout tap can still ask.
 */
export function useShopQuote(items: CartItem[], couponCode: string | null) {
  const key = lineKey(items, couponCode);
  const [quote, setQuote] = useState<ShopQuoteState | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(SHOP_QUOTE_EVENT, refresh);
    return () => window.removeEventListener(SHOP_QUOTE_EVENT, refresh);
  }, []);

  useEffect(() => {
    const lines = shopCheckoutLines(items);
    if (lines.length === 0) {
      setQuote(null);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewCart(
        {
          items: lines,
          couponCode,
          includeSuggestedCoupons: false,
        },
        controller.signal,
      )
        .then((preview) => {
          if (cancelled) return;
          const parsed = parseShopQuote(preview);
          setQuote({
            ...parsed,
            checkoutWarning: previewCheckoutWarning(
              preview,
              lines.map((line) => line.productId),
            ),
          });
          setFailed(false);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          setFailed(true);
        });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [couponCode, items, key, revision]);

  return { quote, failed };
}
