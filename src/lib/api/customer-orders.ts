/**
 * Signed-in order history.
 * GET /api/storefront/orders
 * GET /api/storefront/orders/:id
 */

import { request } from "@/lib/api/client";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/product-image";
import {
  mapCustomerOrder,
  type RawCustomerOrder,
  type RawOrderItem,
} from "@/lib/api/map-customer-order";
import type { SampleOrder } from "@/lib/sample-orders";

export { addressLabel } from "@/lib/api/order-address";
export { mapCustomerOrder } from "@/lib/api/map-customer-order";

export async function listCustomerOrders(signal?: AbortSignal): Promise<SampleOrder[]> {
  const body = await request<{ orders?: RawCustomerOrder[] }>({
    method: "GET",
    path: "/api/storefront/orders",
    auth: true,
    query: { limit: 50 },
    signal,
  });
  return (body.orders ?? [])
    .map(mapCustomerOrder)
    .filter((order): order is SampleOrder => Boolean(order));
}

export async function getCustomerOrder(
  id: string,
  signal?: AbortSignal,
): Promise<SampleOrder | null> {
  const body = await request<{ order?: RawCustomerOrder; items?: RawOrderItem[] }>({
    method: "GET",
    path: `/api/storefront/orders/${id}`,
    auth: true,
    signal,
  });
  const order = body.order ?? (body as RawCustomerOrder);
  if (!order?.id && body.order) return null;
  return mapCustomerOrder({ ...order, items: order.items ?? body.items });
}

/** Fallback thumb when API/sample/snapshot have no photo. */
export function orderLineImageFallback(): string {
  return PRODUCT_IMAGE_FALLBACK;
}
