import { getSampleProduct } from "@/lib/sample-products";

/**
 * ⚠️ SAMPLE DATA — UI development only.
 * Not real orders. Replace with orders API when available.
 */

export type OrderStatus =
  | "placed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type SampleOrderLine = {
  productId: string;
  /** Packs, or kg for weight products. */
  qty: number;
  isWeight?: boolean;
  /** Snapshot selling price for the line (sample). */
  lineTotal: number;
  lineMrp: number;
};

export type OrderTimelineStep = {
  key: OrderStatus;
  label: string;
  at?: string;
};

/** Detail tracker steps for the ORDER STATUS card. */
export type OrderProgressId =
  | "received"
  | "confirmed"
  | "processed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderProgressStep = {
  id: OrderProgressId;
  /** First line e.g. "Order" */
  eyebrow: string;
  /** Second line e.g. "Received" */
  title: string;
  at?: string;
};

export type SampleOrder = {
  id: string;
  /** Short display id e.g. YAD-1042 */
  number: string;
  placedAtLabel: string;
  status: OrderStatus;
  paymentLabel: string;
  addressLabel: string;
  addressDetail: string;
  lines: SampleOrderLine[];
  /** Item MRP sum. */
  mrpTotal: number;
  /** Selling sum before promo. */
  subtotal: number;
  promoCode?: string;
  promoDiscount: number;
  /** Final amount due / paid. */
  totalDue: number;
  timeline: OrderTimelineStep[];
  /** Times for the 5-step ORDER STATUS card (playground preview). */
  progressTimes?: Partial<Record<OrderProgressId, string>>;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
}

/** Chip theme aligned with coupon Active / Used / Expired language. */
export function orderStatusChip(status: OrderStatus): {
  label: string;
  className: string;
} {
  if (status === "delivered") {
    return {
      label: "Delivered",
      className:
        "bg-forest text-white shadow-[0_2px_0_0_#1a4d1a] ring-2 ring-mint",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className:
        "bg-red-50 text-red-700 ring-2 ring-dashed ring-red-400/80",
    };
  }
  if (status === "out_for_delivery") {
    return {
      label: "Out for delivery",
      className:
        "bg-track text-black shadow-[0_2px_0_0_#1f5c1f] ring-1 ring-forest/20",
    };
  }
  if (status === "packed") {
    return {
      label: "Packed",
      className: "bg-mint text-forest ring-1 ring-leaf/30",
    };
  }
  return {
    label: "Placed",
    className: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/80",
  };
}

/** Progress index for timeline (cancelled stops early). */
export function orderTimelineIndex(status: OrderStatus): number {
  if (status === "cancelled") return 0;
  const order: OrderStatus[] = [
    "placed",
    "packed",
    "out_for_delivery",
    "delivered",
  ];
  return Math.max(0, order.indexOf(status));
}

const PROGRESS_DEFS: Omit<OrderProgressStep, "at">[] = [
  { id: "received", eyebrow: "Order", title: "Received" },
  { id: "confirmed", eyebrow: "Order", title: "Confirmed" },
  { id: "processed", eyebrow: "Order", title: "Processed" },
  { id: "shipped", eyebrow: "Order", title: "Shipped" },
  { id: "delivered", eyebrow: "Order", title: "Delivered" },
];

/** Current step index 0–4 for the ORDER STATUS card (−1 if cancelled). */
export function orderProgressIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  if (status === "placed") return 1;
  if (status === "packed") return 2;
  if (status === "out_for_delivery") return 3;
  if (status === "delivered") return 4;
  return 0;
}

export type BuiltOrderProgressStep = OrderProgressStep & {
  done: boolean;
  current: boolean;
};

/**
 * ORDER STATUS steps. Cancelled: only steps that happened, then terminal Cancelled
 * (no pending Processed / Shipped / Delivered).
 */
export function buildOrderProgress(order: SampleOrder): BuiltOrderProgressStep[] {
  const times = order.progressTimes ?? {};
  const fallback = (key: OrderStatus) =>
    order.timeline.find((s) => s.key === key)?.at;

  const atFor = (id: OrderProgressId): string | undefined => {
    if (id === "cancelled") {
      return order.timeline.find((s) => s.key === "cancelled")?.at;
    }
    if (times[id]) return times[id];
    if (id === "received") return fallback("placed");
    if (id === "confirmed") return times.confirmed ?? fallback("placed");
    if (id === "processed") return fallback("packed");
    if (id === "shipped") return fallback("out_for_delivery");
    if (id === "delivered") return fallback("delivered");
    return undefined;
  };

  if (order.status === "cancelled") {
    const completed: BuiltOrderProgressStep[] = [];
    for (const step of PROGRESS_DEFS) {
      // Only steps with an explicit progress time (or placed → received) happened.
      const at =
        times[step.id] ??
        (step.id === "received" ? fallback("placed") : undefined);
      if (!at) break;
      completed.push({
        ...step,
        at,
        done: true,
        current: false,
      });
    }
    completed.push({
      id: "cancelled",
      eyebrow: "Order",
      title: "Cancelled",
      at: atFor("cancelled"),
      done: true,
      current: true,
    });
    return completed;
  }

  const idx = orderProgressIndex(order.status);
  return PROGRESS_DEFS.map((step, i) => ({
    ...step,
    at: atFor(step.id),
    done: idx >= 0 && i <= idx,
    current: idx >= 0 && i === idx,
  }));
}

export const SAMPLE_ORDERS: SampleOrder[] = [
  {
    id: "ord-1042",
    number: "YAD-1042",
    placedAtLabel: "Today · 11:20 AM",
    status: "out_for_delivery",
    paymentLabel: "Cash on Delivery",
    addressLabel: "Home",
    addressDetail: "arine amaryllis 101, Begur, Bengaluru 560114",
    lines: [
      {
        productId: "fr-1",
        qty: 2,
        lineTotal: 0,
        lineMrp: 0,
      },
      {
        productId: "vg-3",
        qty: 1.5,
        isWeight: true,
        lineTotal: 0,
        lineMrp: 0,
      },
      {
        productId: "bv-1",
        qty: 1,
        lineTotal: 0,
        lineMrp: 0,
      },
    ],
    mrpTotal: 0,
    subtotal: 0,
    promoCode: "FRESH10",
    promoDiscount: 0,
    totalDue: 0,
    timeline: [
      { key: "placed", label: "Order placed", at: "Today · 11:20 AM" },
      { key: "packed", label: "Packed", at: "Today · 11:45 AM" },
      { key: "out_for_delivery", label: "Out for delivery", at: "Today · 12:10 PM" },
      { key: "delivered", label: "Delivered" },
    ],
    progressTimes: {
      received: "Today · 11:20 AM",
      confirmed: "Today · 11:28 AM",
      processed: "Today · 11:45 AM",
      shipped: "Today · 12:10 PM",
    },
  },
  {
    id: "ord-1038",
    number: "YAD-1038",
    placedAtLabel: "22 Oct · 6:40 PM",
    status: "delivered",
    paymentLabel: "Cash on Delivery",
    addressLabel: "Home",
    addressDetail: "arine amaryllis 101, Begur, Bengaluru 560114",
    lines: [
      { productId: "sn-1", qty: 2, lineTotal: 0, lineMrp: 0 },
      { productId: "de-1", qty: 1, lineTotal: 0, lineMrp: 0 },
      { productId: "bk-1", qty: 1, lineTotal: 0, lineMrp: 0 },
      { productId: "fr-4", qty: 3, lineTotal: 0, lineMrp: 0 },
    ],
    mrpTotal: 0,
    subtotal: 0,
    promoDiscount: 0,
    totalDue: 0,
    timeline: [
      { key: "placed", label: "Order placed", at: "22 Oct · 6:40 PM" },
      { key: "packed", label: "Packed", at: "22 Oct · 7:05 PM" },
      { key: "out_for_delivery", label: "Out for delivery", at: "22 Oct · 7:30 PM" },
      { key: "delivered", label: "Delivered", at: "22 Oct · 8:10 PM" },
    ],
    progressTimes: {
      received: "22 Oct · 6:40 PM",
      confirmed: "22 Oct · 6:48 PM",
      processed: "22 Oct · 7:05 PM",
      shipped: "22 Oct · 7:30 PM",
      delivered: "22 Oct · 8:10 PM",
    },
  },
  {
    id: "ord-1021",
    number: "YAD-1021",
    placedAtLabel: "18 Oct · 2:15 PM",
    status: "cancelled",
    paymentLabel: "Cash on Delivery",
    addressLabel: "Office",
    addressDetail: "12 Avinashi Road, Coimbatore 641014",
    lines: [
      { productId: "vg-4", qty: 1, lineTotal: 0, lineMrp: 0 },
      { productId: "bv-2", qty: 2, lineTotal: 0, lineMrp: 0 },
    ],
    mrpTotal: 0,
    subtotal: 0,
    promoDiscount: 0,
    totalDue: 0,
    timeline: [
      { key: "placed", label: "Order placed", at: "18 Oct · 2:15 PM" },
      { key: "cancelled", label: "Cancelled", at: "18 Oct · 2:40 PM" },
    ],
    progressTimes: {
      received: "18 Oct · 2:15 PM",
      confirmed: "18 Oct · 2:22 PM",
    },
  },
];

function hydrateLine(line: SampleOrderLine): SampleOrderLine {
  const product = getSampleProduct(line.productId);
  if (!product) return line;
  const qty = line.qty;
  const lineTotal = line.isWeight
    ? Math.round(qty * product.price)
    : qty * product.price;
  const lineMrp = line.isWeight
    ? Math.round(qty * product.mrp)
    : qty * product.mrp;
  return { ...line, lineTotal, lineMrp };
}

function hydrateOrder(order: SampleOrder): SampleOrder {
  const lines = order.lines.map(hydrateLine);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.lineMrp, 0);
  let promoDiscount = order.promoDiscount;
  if (order.promoCode === "FRESH10" && promoDiscount === 0) {
    promoDiscount = Math.min(150, Math.round(subtotal * 0.1));
  }
  const totalDue = Math.max(0, subtotal - promoDiscount);
  return { ...order, lines, subtotal, mrpTotal, promoDiscount, totalDue };
}

const HYDRATED = SAMPLE_ORDERS.map(hydrateOrder);

export function listSampleOrders(): SampleOrder[] {
  return HYDRATED;
}

export function getSampleOrder(id: string): SampleOrder | undefined {
  return HYDRATED.find((o) => o.id === id);
}

export function orderLineLabel(line: SampleOrderLine): string {
  if (line.isWeight) {
    const kg = Number.isInteger(line.qty) ? String(line.qty) : line.qty.toFixed(1);
    return `${kg} kg`;
  }
  return `×${line.qty}`;
}
