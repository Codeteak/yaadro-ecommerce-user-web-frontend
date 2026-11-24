"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { previewCart } from "@/lib/api/cart";
import type { CartItem } from "@/lib/cart-lines";
import {
  parseShopQuote,
  previewCheckoutWarning,
  shopCheckoutLines,
  shopQuoteBasketKey,
  SHOP_QUOTE_EVENT,
  type ShopQuote,
} from "@/lib/cart-checkout-rules";

const PREVIEW_DEBOUNCE_MS = 280;

export type ShopQuoteState = ShopQuote & {
  /** Basket+coupon key this quote was priced for. */
  basketKey: string;
  /** From the same preview — cart can skip a second POST on Checkout. */
  checkoutWarning: string | null;
};

export function shopQuoteQueryKey(basketKey: string) {
  return ["shop-quote", basketKey] as const;
}

/**
 * Prices the on-device basket with the shop (React Query + short debounce).
 * Cart and checkout share the same cache key.
 */
export function useShopQuote(items: CartItem[], couponCode: string | null) {
  const queryClient = useQueryClient();
  const lines = useMemo(() => shopCheckoutLines(items), [items]);
  const basketKey = useMemo(
    () => shopQuoteBasketKey(items, couponCode),
    [items, couponCode],
  );
  const [debouncedKey, setDebouncedKey] = useState(basketKey);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKey(basketKey), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [basketKey]);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(SHOP_QUOTE_EVENT, refresh);
    return () => window.removeEventListener(SHOP_QUOTE_EVENT, refresh);
  }, []);

  const enabled = lines.length > 0 && debouncedKey === basketKey;

  const query = useQuery({
    queryKey: [...shopQuoteQueryKey(debouncedKey), revision],
    enabled,
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<ShopQuoteState> => {
      const preview = await previewCart(
        {
          items: lines,
          couponCode,
          includeSuggestedCoupons: false,
        },
        signal,
      );
      const parsed = parseShopQuote(preview);
      return {
        ...parsed,
        basketKey: debouncedKey,
        checkoutWarning: previewCheckoutWarning(
          preview,
          lines.map((line) => line.productId),
        ),
      };
    },
  });

  const quote =
    lines.length === 0
      ? null
      : query.data && query.data.basketKey === basketKey
        ? query.data
        : null;

  return {
    quote,
    failed: lines.length === 0 ? false : query.isError,
    isLoading: enabled && query.isFetching && !quote,
    basketKey,
    /** True when quote matches the current basket (safe to skip re-preview). */
    quoteMatchesBasket: Boolean(quote && quote.basketKey === basketKey),
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: ["shop-quote"] });
    },
  };
}
