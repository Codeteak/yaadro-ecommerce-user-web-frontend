/**
 * Place a cash-on-delivery order from the on-device basket.
 * POST /api/storefront/checkout
 * The shop prices the lines. This client never invents a total.
 */

import { request } from "@/lib/api/client";

export type CheckoutLine = {
  productId: string;
  quantity: number;
};

export type CheckoutResult = {
  orderId: string;
  orderNumber: string;
  subtotal_minor: number;
  promotion_discount_minor: number;
  coupon_discount_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
  coupon_code: string | null;
};

export function placeCheckoutOrder(
  input: {
    items: CheckoutLine[];
    notes?: string | null;
    couponCode?: string | null;
    idempotencyKey: string;
  },
  signal?: AbortSignal,
): Promise<CheckoutResult> {
  return request<CheckoutResult>({
    method: "POST",
    path: "/api/storefront/checkout",
    auth: true,
    idempotent: false,
    idempotencyKey: input.idempotencyKey,
    signal,
    body: {
      items: input.items,
      notes: input.notes ?? null,
      couponCode: input.couponCode ?? null,
    },
  });
}
