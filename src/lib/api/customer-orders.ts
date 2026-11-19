/**
 * Signed-in order history.
 * GET /api/storefront/orders
 * GET /api/storefront/orders/:id
 */

import { request } from "@/lib/api/client";
import { addressLabel } from "@/lib/api/order-address";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/product-image";
import type { OrderStatus, SampleOrder, SampleOrderLine } from "@/lib/sample-orders";

export { addressLabel } from "@/lib/api/order-address";

type RawItem = {
  product_id?: string;
  product_name_snapshot?: string;
  quantity?: string | number;
  sold_by_weight?: boolean;
  line_total_minor?: number;
  list_price_minor?: number;
  unit_price_minor_snapshot?: number;
  /** Image URL variants shops may return on a line. */
  product_image_url?: string | null;
  product_image_snapshot?: string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
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

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickImage(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      const raw = value.trim();
      if (/,https?:\/\//i.test(raw)) {
        return raw.split(/,(?=https?:\/\/)/i)[0]?.trim() || "";
      }
      return raw;
    }
    if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      const nested = pickText(row.url, row.imageUrl, row.image_url, row.src);
      if (nested) return nested;
    }
  }
  return "";
}

function mapLine(item: RawItem): SampleOrderLine {
  const qty = Number(item.quantity);
  const lineTotal = rupees(item.line_total_minor);
  const list = rupees(item.list_price_minor ?? item.unit_price_minor_snapshot);
  const image = pickImage(
    item.product_image_url,
    item.product_image_snapshot,
    item.image_url,
    item.image,
    item.thumbnail_url,
  );
  return {
    productId: item.product_id ?? "",
    name: item.product_name_snapshot,
    qty: Number.isFinite(qty) ? qty : 1,
    isWeight: item.sold_by_weight === true,
    lineTotal,
    lineMrp: Math.max(lineTotal, list * (Number.isFinite(qty) ? qty : 1)),
    image: image || undefined,
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
  const deliveryFee = rupees(raw.delivery_fee_minor);
  let totalDue = rupees(raw.total_minor);
  // Some responses leave total equal to subtotal even when a promo was applied.
  if (discount > 0 && totalDue >= subtotal) {
    totalDue = Math.max(0, subtotal - discount) + deliveryFee;
  }
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
    totalDue,
    deliveryFee,
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

/** Fallback thumb when API/sample/snapshot have no photo. */
export function orderLineImageFallback(): string {
  return PRODUCT_IMAGE_FALLBACK;
}
