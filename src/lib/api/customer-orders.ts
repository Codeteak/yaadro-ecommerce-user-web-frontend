/**
 * Signed-in order history.
 * GET /api/storefront/orders
 * GET /api/storefront/orders/:id
 */

import { request } from "@/lib/api/client";
import type { OrderStatus, SampleOrder, SampleOrderLine } from "@/lib/sample-orders";

type RawItem = {
  product_id?: string;
  product_name_snapshot?: string;
  quantity?: string | number;
  sold_by_weight?: boolean;
  line_total_minor?: number;
  list_price_minor?: number;
  unit_price_minor_snapshot?: number;
};

type RawOrder = {
  id?: string;
  order_number?: string;
  status?: string;
  placed_at?: string;
  subtotal_minor?: number;
  delivery_fee_minor?: number;
  total_minor?: number;
  promotion_discount_total_minor?: number;
  coupon_code?: string | null;
  customer_address?: unknown;
  payment_method?: string | null;
  items?: RawItem[];
};

function rupees(minor: unknown): number {
  const value = typeof minor === "number" ? minor : Number(minor);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 100);
}

function mapStatus(status: string | undefined): OrderStatus {
  const value = (status ?? "").toLowerCase();
  if (value.includes("deliver") && !value.includes("out")) return "delivered";
  if (value.includes("out") || value.includes("ship")) return "out_for_delivery";
  if (value.includes("pack") || value.includes("accept") || value.includes("pick")) return "packed";
  if (value.includes("cancel") || value.includes("reject")) return "cancelled";
  return "placed";
}

function addressLabel(value: unknown): { label: string; detail: string } {
  if (!value || typeof value !== "object") return { label: "Delivery address", detail: "" };
  const row = value as Record<string, unknown>;
  const parts = [row.line1, row.line2, row.landmark, row.city]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return {
    label: parts[0] ?? "Delivery address",
    detail: parts.slice(1).join(", "),
  };
}

function mapLine(item: RawItem): SampleOrderLine {
  const qty = Number(item.quantity);
  const lineTotal = rupees(item.line_total_minor);
  const list = rupees(item.list_price_minor ?? item.unit_price_minor_snapshot);
  return {
    productId: item.product_id ?? "",
    name: item.product_name_snapshot,
    qty: Number.isFinite(qty) ? qty : 1,
    isWeight: item.sold_by_weight === true,
    lineTotal,
    lineMrp: Math.max(lineTotal, list * (Number.isFinite(qty) ? qty : 1)),
  };
}

export function mapCustomerOrder(raw: RawOrder): SampleOrder | null {
  if (!raw.id) return null;
  const placed = raw.placed_at ? new Date(raw.placed_at) : null;
  const placedAtLabel =
    placed && !Number.isNaN(placed.getTime())
      ? placed.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const address = addressLabel(raw.customer_address);
  const status = mapStatus(raw.status);
  const subtotal = rupees(raw.subtotal_minor);
  const discount = rupees(raw.promotion_discount_total_minor);
  return {
    id: raw.id,
    number: raw.order_number ?? raw.id.slice(0, 8).toUpperCase(),
    placedAtLabel,
    status,
    paymentLabel: raw.payment_method === "cod" || !raw.payment_method ? "Cash on delivery" : "Paid",
    addressLabel: address.label,
    addressDetail: address.detail,
    lines: Array.isArray(raw.items) ? raw.items.map(mapLine) : [],
    mrpTotal: subtotal + discount,
    subtotal,
    promoCode: raw.coupon_code ?? undefined,
    promoDiscount: discount,
    totalDue: rupees(raw.total_minor),
    deliveryFee: rupees(raw.delivery_fee_minor),
    timeline: [{ key: status, label: placedAtLabel, at: placedAtLabel }],
  };
}

export async function listCustomerOrders(signal?: AbortSignal): Promise<SampleOrder[]> {
  const body = await request<{ orders?: RawOrder[] }>({
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

export async function getCustomerOrder(id: string, signal?: AbortSignal): Promise<SampleOrder | null> {
  const body = await request<{ order?: RawOrder; items?: RawItem[] }>({
    method: "GET",
    path: `/api/storefront/orders/${id}`,
    auth: true,
    signal,
  });
  const order = body.order ?? (body as RawOrder);
  if (!order?.id && body.order) return null;
  return mapCustomerOrder({ ...order, items: order.items ?? body.items });
}
