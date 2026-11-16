/**
 * Server cart mutations are retired (410). The basket stays on this device.
 * Preview asks the shop to price the lines the shopper already has.
 */

import { request } from "@/lib/api/client";

export type CartPreviewLine = {
  productId: string;
  quantity: number;
};

export type CartPreview = {
  items?: unknown[];
  subtotalMinor?: number;
  totalMinor?: number;
  discountMinor?: number;
  couponCode?: string | null;
  suggestedCoupons?: unknown[];
  [key: string]: unknown;
};

export function previewCart(
  input: {
    items: CartPreviewLine[];
    couponCode?: string | null;
    couponCodes?: string[];
    includeSuggestedCoupons?: boolean;
  },
  signal?: AbortSignal,
): Promise<CartPreview> {
  return request<CartPreview>({
    method: "POST",
    path: "/api/storefront/cart/preview",
    auth: true,
    idempotent: true,
    signal,
    body: input,
  });
}

/**
 * These routes exist but the shop returns 410 CART_SERVER_RETIRED.
 * Kept so callers get the friendly message instead of a raw fetch.
 */
export function getServerCart(couponCode?: string, signal?: AbortSignal) {
  return request({
    method: "GET",
    path: "/api/storefront/cart",
    auth: true,
    query: { couponCode },
    signal,
  });
}
