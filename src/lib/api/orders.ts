/**
 * Orders API façade.
 *
 * Today: wraps sample order data so storefront pages look like API clients.
 * Later: replace bodies with `fetch` against the real orders endpoints.
 * No fake network delays.
 */
import {
  getSampleOrder,
  listSampleOrders,
  type SampleOrder,
} from "@/lib/sample-orders";

export function listOrders(): SampleOrder[] {
  return listSampleOrders();
}

export function getOrder(id: string): SampleOrder | undefined {
  return getSampleOrder(id);
}

/** Lookup by display number (e.g. YAD-1042) or `#YAD-1042`. */
export function getOrderByNumber(number: string): SampleOrder | undefined {
  const normalized = number.trim().replace(/^#/, "").toUpperCase();
  if (!normalized) return undefined;
  return listSampleOrders().find((o) => o.number.toUpperCase() === normalized);
}
