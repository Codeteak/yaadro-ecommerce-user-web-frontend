/**
 * Playground sample for live order tracking.
 * Flow: Order placed → Accepted → Packed → Out for delivery → Delivered.
 * Not wired to storefront /orders yet. INR + Yaadro green theme.
 */

export type LiveTrackPhase =
  | "accepted"
  | "packed"
  | "out_for_delivery"
  | "delivered";

export type LiveHeaderStepId = "placed" | "out_for_delivery" | "delivered";

export type LiveHeaderStep = {
  id: LiveHeaderStepId;
  label: string;
  at?: string;
};

export type LiveProgressStep = {
  id: string;
  label: string;
  at?: string;
  detail: string;
  done: boolean;
};

export type LiveOrderLine = {
  name: string;
  qty: number;
  price: number;
  /** Optional display label (e.g. "1.5 kg") from order mapping. */
  qtyLabel?: string;
};

export type LiveOrderTrackSample = {
  phase: LiveTrackPhase;
  shopName: string;
  billNo: string;
  trackingId: string;
  statusBadge: string;
  statusMessage: string;
  receiver: string;
  contact: string;
  shopContact: string;
  itemCount: number;
  amount: number;
  lines: LiveOrderLine[];
  rider: { name: string; initial: string; phone: string } | null;
  headerSteps: LiveHeaderStep[];
  progress: LiveProgressStep[];
  /** Map endpoints for Google Maps Embed when the public key is set. */
  mapOrigin: { lat: number; lng: number };
  mapDestination: { lat: number; lng: number };
};

/** Canonical grocery order path (playground live track). */
const FLOW = [
  {
    id: "placed",
    label: "Order placed",
    success: "Order placed successfully.",
  },
  {
    id: "accepted",
    label: "Accepted",
    success:
      "Accepted by the shop. Live tracking unlocks when a partner is assigned.",
  },
  {
    id: "packed",
    label: "Packed",
    success:
      "Packed and ready. Live tracking unlocks when a partner is assigned.",
  },
  {
    id: "out_for_delivery",
    label: "Out for delivery",
    success: "Your order is on the way to you.",
  },
  {
    id: "delivered",
    label: "Delivered",
    success: "Your order has been delivered.",
  },
] as const;

type FlowId = (typeof FLOW)[number]["id"];

const TIMES: Partial<Record<FlowId, string>> = {
  placed: "2:36 PM, 16 Nov 2026",
  accepted: "2:37 PM, 16 Nov 2026",
  packed: "2:39 PM, 16 Nov 2026",
  out_for_delivery: "2:41 PM, 16 Nov 2026",
  delivered: "2:55 PM, 16 Nov 2026",
};

function buildProgress(doneThrough: FlowId): LiveProgressStep[] {
  const doneIdx = FLOW.findIndex((s) => s.id === doneThrough);
  return FLOW.map((step, i) => {
    const done = i <= doneIdx;
    return {
      id: step.id,
      label: step.label,
      at: done ? TIMES[step.id] : undefined,
      detail: done ? step.success : "Waiting for this stage.",
      done,
    };
  });
}

const SHARED = {
  shopName: "Yaadro Fresh",
  billNo: "#YAD-32122",
  trackingId: "YAD-32122",
  receiver: "Max",
  contact: "+91 98765 43210",
  shopContact: "+91 80 4567 8901",
  itemCount: 2,
  amount: 36,
  lines: [
    { name: "Ayala Fry", qty: 1, price: 9 },
    { name: "Banana Ball", qty: 1, price: 2 },
  ] satisfies LiveOrderLine[],
  mapOrigin: { lat: 12.891, lng: 77.641 },
  mapDestination: { lat: 12.877, lng: 77.632 },
};

const HEADER_BASE: LiveHeaderStep[] = [
  { id: "placed", label: "Placed", at: "2:37pm" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
];

export const LIVE_TRACK_ACCEPTED: LiveOrderTrackSample = {
  ...SHARED,
  phase: "accepted",
  statusBadge: "Accepted",
  statusMessage:
    "Order accepted. You can live-track once the shop assigns a delivery partner.",
  rider: null,
  headerSteps: HEADER_BASE,
  progress: buildProgress("accepted"),
};

export const LIVE_TRACK_PACKED: LiveOrderTrackSample = {
  ...SHARED,
  phase: "packed",
  statusBadge: "Packed",
  statusMessage:
    "Order packed. Live tracking unlocks when the shop assigns a delivery partner.",
  rider: null,
  headerSteps: HEADER_BASE,
  progress: buildProgress("packed"),
};

export const LIVE_TRACK_OUT_FOR_DELIVERY: LiveOrderTrackSample = {
  ...SHARED,
  phase: "out_for_delivery",
  statusBadge: "Out for delivery",
  statusMessage: "Your order is on the way to you.",
  rider: {
    name: "Abhinav Aneesh",
    initial: "A",
    phone: "+91 98765 01234",
  },
  headerSteps: [
    { id: "placed", label: "Placed", at: "2:37pm" },
    { id: "out_for_delivery", label: "Out for delivery", at: "2:41pm" },
    { id: "delivered", label: "Delivered" },
  ],
  progress: buildProgress("out_for_delivery"),
};

export const LIVE_TRACK_DELIVERED: LiveOrderTrackSample = {
  ...SHARED,
  phase: "delivered",
  statusBadge: "Delivered",
  statusMessage: "Your order has been delivered.",
  // Keep partner name after delivery; UI hides call / phone number.
  rider: {
    name: "Abhinav Aneesh",
    initial: "A",
    phone: "+91 98765 01234",
  },
  headerSteps: [
    { id: "placed", label: "Placed", at: "2:37pm" },
    { id: "out_for_delivery", label: "Out for delivery", at: "2:41pm" },
    { id: "delivered", label: "Delivered", at: "2:55pm" },
  ],
  progress: buildProgress("delivered"),
};

export function liveTrackSample(phase: LiveTrackPhase): LiveOrderTrackSample {
  if (phase === "accepted") return LIVE_TRACK_ACCEPTED;
  if (phase === "packed") return LIVE_TRACK_PACKED;
  if (phase === "delivered") return LIVE_TRACK_DELIVERED;
  return LIVE_TRACK_OUT_FOR_DELIVERY;
}

export function liveHeaderActiveIndex(sample: LiveOrderTrackSample): number {
  if (sample.phase === "delivered") return 2;
  if (sample.phase === "out_for_delivery") return 1;
  // accepted + packed still on first header step
  return 0;
}
