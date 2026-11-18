"use client";

import { useEffect, useState } from "react";
import { previewCart } from "@/lib/api/cart";
import type { CartItem } from "@/lib/cart-lines";
import {
  parseShopQuote,
  shopCheckoutLines,
  SHOP_QUOTE_EVENT,
  type ShopQuote,
} from "@/lib/cart-checkout-rules";

function lineKey(items: CartItem[], couponCode: string | null): string {
  const lines = shopCheckoutLines(items);
  return `${lines.map((line) => `${line.productId}:${line.quantity}`).join("|")}|${couponCode ?? ""}`;
}

/**
 * Prices the on-device basket with the shop.
 * A failed preview leaves `failed` set so the Checkout tap can still ask.
 */
export function useShopQuote(items: CartItem[], couponCode: string | null) {
  const key = lineKey(items, couponCode);
  const [quote, setQuote] = useState<ShopQuote | null>(null);
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
        setQuote(parseShopQuote(preview));
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [couponCode, items, key, revision]);

  return { quote, failed };
}
