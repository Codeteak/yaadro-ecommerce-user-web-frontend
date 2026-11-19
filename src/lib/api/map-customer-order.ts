/**
 * Pure mapping from shop order JSON → SampleOrder bill fields.
 * Item total is before promo so Item − Promo + Shipping = Total.
 */

import { addressLabel } from "./order-address.ts";
import type {
  OrderStatus,
  SampleOrder,
  SampleOrderLine,
  SampleOrderRider,
} from "../sample-orders.ts";

export type RawOrderItem = {
  product_id?: string;
  product_name_snapshot?: string;
  quantity?: string | number;
  sold_by_weight?: boolean;
  line_total_minor?: number;
  list_price_minor?: number;
  unit_price_minor_snapshot?: number;
  product_image_url?: string | null;
  product_image_snapshot?: string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
};

export type RawCustomerOrder = {
  id?: string;
  order_number?: string;
  status?: string;
  placed_at?: string;
  subtotal_minor?: number;
  subtotal_before_coupon_minor?: number;
  delivery_fee_minor?: number;
  total_minor?: number;
  promotion_discount_total_minor?: number;
  coupon_discount_minor?: number;
  coupon_code?: string | null;
  customer_address?: unknown;
  payment_method?: string | null;
  items?: RawOrderItem[];
  /** Delivery partner — only when the shop/DMS API sends one (never invent). */
  delivery_partner?: unknown;
  deliveryPartner?: unknown;
  rider?: unknown;
  delivery_partner_name?: string | null;
  deliveryPartnerName?: string | null;
  rider_name?: string | null;
  riderName?: string | null;
  delivery_agent_name?: string | null;
  agent_name?: string | null;
  delivery_partner_phone?: string | null;
  deliveryPartnerPhone?: string | null;
  rider_phone?: string | null;
  riderPhone?: string | null;
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

function mapLine(item: RawOrderItem): SampleOrderLine {
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

/**
 * Map a delivery partner only when the API includes one.
 * Does not use shop `picker_name` (that is packing staff, not the rider).
 */
export function mapDeliveryPartner(
  raw: RawCustomerOrder,
): SampleOrderRider | undefined {
  const nested =
    (raw.delivery_partner && typeof raw.delivery_partner === "object"
      ? (raw.delivery_partner as Record<string, unknown>)
      : null) ??
    (raw.deliveryPartner && typeof raw.deliveryPartner === "object"
      ? (raw.deliveryPartner as Record<string, unknown>)
      : null) ??
    (raw.rider && typeof raw.rider === "object"
      ? (raw.rider as Record<string, unknown>)
      : null);

  const name = pickText(
    nested?.name,
    nested?.full_name,
    nested?.fullName,
    nested?.display_name,
    nested?.displayName,
    raw.delivery_partner_name,
    raw.deliveryPartnerName,
    raw.rider_name,
    raw.riderName,
    raw.delivery_agent_name,
    raw.agent_name,
  );
  if (!name) return undefined;

  const phone = pickText(
    nested?.phone,
    nested?.mobile,
    nested?.phone_number,
    nested?.phoneNumber,
    raw.delivery_partner_phone,
    raw.deliveryPartnerPhone,
    raw.rider_phone,
    raw.riderPhone,
  );
  const initial =
    pickText(nested?.initial, nested?.initials)?.slice(0, 1).toUpperCase() ||
    name.trim().charAt(0).toUpperCase() ||
    "D";

  return { name, initial, phone };
}

export function mapCustomerOrder(raw: RawCustomerOrder): SampleOrder | null {
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
  // Shop `subtotal_minor` is payable items (already net of coupon/promos).
  const netItems = rupees(raw.subtotal_minor);
  const couponDisc = rupees(raw.coupon_discount_minor);
  const promoDisc = rupees(raw.promotion_discount_total_minor);
  const discount = Math.max(promoDisc, couponDisc);
  const beforeCoupon = rupees(raw.subtotal_before_coupon_minor);
  // Bill "Item total" must be before promo so Item − Promo + Shipping = Total.
  const itemTotal = beforeCoupon > 0 ? beforeCoupon : netItems + discount;
  const deliveryFee = rupees(raw.delivery_fee_minor);
  const derivedTotal = Math.max(0, itemTotal - discount) + deliveryFee;
  let totalDue = rupees(raw.total_minor);
  // Repair only clear API mistakes — never double-subtract an already-net subtotal.
  if (totalDue === netItems && deliveryFee > 0) {
    totalDue = derivedTotal;
  } else if (discount > 0 && totalDue === itemTotal) {
    totalDue = derivedTotal;
  } else if (totalDue <= 0 && derivedTotal > 0) {
    totalDue = derivedTotal;
  }
  const lines = Array.isArray(raw.items) ? raw.items.map(mapLine) : [];
  const linesMrp = lines.reduce((sum, line) => sum + line.lineMrp, 0);
  const rider = mapDeliveryPartner(raw);
  return {
    id: raw.id,
    number: raw.order_number ?? raw.id.slice(0, 8).toUpperCase(),
    placedAtLabel,
    status,
    paymentLabel:
      raw.payment_method === "cod" || !raw.payment_method
        ? "Cash on delivery"
        : "Paid",
    addressLabel: address.label,
    addressDetail: address.detail,
    lines,
    mrpTotal: linesMrp > 0 ? linesMrp : itemTotal,
    subtotal: itemTotal,
    promoCode: raw.coupon_code ?? undefined,
    promoDiscount: discount,
    totalDue,
    deliveryFee,
    timeline: [{ key: status, label: placedAtLabel, at: placedAtLabel }],
    ...(rider ? { rider } : {}),
  };
}
