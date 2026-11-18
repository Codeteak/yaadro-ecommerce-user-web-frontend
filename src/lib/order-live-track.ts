/**
 * Map storefront sample orders → live track UI sample.
 * Cancelled orders stay on the classic order-detail layout.
 */
import { getSampleProduct } from "@/lib/sample-products";
import {
  orderLineLabel,
  type OrderStatus,
  type SampleOrder,
} from "@/lib/sample-orders";
import {
  type LiveHeaderStep,
  type LiveOrderTrackSample,
  type LiveProgressStep,
  type LiveTrackPhase,
} from "@/lib/live-order-track";

const SHOP_CONTACT = "+91 80 4567 8901";
/** Sample customer phone until orders API returns one. */
const SAMPLE_CONTACT = "+91 98765 43210";

/** Default playground map pins (Bengaluru) until orders carry coordinates. */
const MAP_ORIGIN = { lat: 12.891, lng: 77.641 };
const MAP_DESTINATION = { lat: 12.877, lng: 77.632 };

const PHASE_COPY: Record<
  LiveTrackPhase,
  { badge: string; message: string }
> = {
  accepted: {
    badge: "Accepted",
    message: "Your order has been accepted by the shop.",
  },
  packed: {
    badge: "Packed",
    message: "Your order is packed and ready.",
  },
  out_for_delivery: {
    badge: "Out for delivery",
    message: "Your order is on the way to you.",
  },
  delivered: {
    badge: "Delivered",
    message: "Your order has been delivered.",
  },
};

export function orderStatusToLivePhase(
  status: OrderStatus,
): LiveTrackPhase | null {
  if (status === "cancelled") return null;
  if (status === "placed") return "accepted";
  if (status === "packed") return "packed";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  return null;
}

function timelineAt(order: SampleOrder, key: OrderStatus): string | undefined {
  return order.timeline.find((s) => s.key === key)?.at;
}

function buildProgress(
  order: SampleOrder,
  phase: LiveTrackPhase,
): LiveProgressStep[] {
  const placedAt = timelineAt(order, "placed");
  const acceptedAt =
    order.progressTimes?.confirmed ?? placedAt;
  const packedAt = timelineAt(order, "packed");
  const ofdAt = timelineAt(order, "out_for_delivery");
  const deliveredAt = timelineAt(order, "delivered");

  const steps: {
    id: string;
    label: string;
    at?: string;
    success: string;
    reached: boolean;
  }[] = [
    {
      id: "placed",
      label: "Order placed",
      at: placedAt,
      success: "Order placed successfully.",
      reached: true,
    },
    {
      id: "accepted",
      label: "Accepted",
      at: acceptedAt,
      success: "Your order has been accepted by the shop.",
      reached: true,
    },
    {
      id: "packed",
      label: "Packed",
      at: packedAt,
      success: "Your order is packed and ready.",
      reached:
        phase === "packed" ||
        phase === "out_for_delivery" ||
        phase === "delivered",
    },
    {
      id: "out_for_delivery",
      label: "Out for delivery",
      at: ofdAt,
      success: "Your order is on the way to you.",
      reached: phase === "out_for_delivery" || phase === "delivered",
    },
    {
      id: "delivered",
      label: "Delivered",
      at: deliveredAt,
      success: "Your order has been delivered.",
      reached: phase === "delivered",
    },
  ];

  return steps.map((s) => ({
    id: s.id,
    label: s.label,
    at: s.reached ? s.at : undefined,
    detail: s.reached ? s.success : "Waiting for this stage.",
    done: s.reached,
  }));
}

function buildHeaderSteps(
  order: SampleOrder,
  phase: LiveTrackPhase,
): LiveHeaderStep[] {
  const placedClock = clockish(timelineAt(order, "placed"));
  const ofdClock = clockish(timelineAt(order, "out_for_delivery"));
  const deliveredClock = clockish(timelineAt(order, "delivered"));

  return [
    {
      id: "placed",
      label: "Placed",
      at: placedClock || undefined,
    },
    {
      id: "out_for_delivery",
      label: "Out for delivery",
      at:
        phase === "out_for_delivery" || phase === "delivered"
          ? ofdClock || undefined
          : undefined,
    },
    {
      id: "delivered",
      label: "Delivered",
      at: phase === "delivered" ? deliveredClock || undefined : undefined,
    },
  ];
}

function clockish(at?: string): string {
  if (!at) return "";
  const parts = at.split("·");
  return (parts[1] ?? parts[0]).trim();
}

/** Sample delivery fee until orders API returns one (matches lead bill). */
function deliveryFee(order: SampleOrder): number {
  return order.status === "cancelled" ? 0 : 25;
}

/**
 * Build live-track sample from a storefront order.
 * Returns null for cancelled (use classic detail instead).
 */
export function toLiveOrderTrackSample(
  order: SampleOrder,
  shopName = "Yaadro",
): LiveOrderTrackSample | null {
  const phase = orderStatusToLivePhase(order.status);
  if (!phase) return null;

  const copy = PHASE_COPY[phase];
  const itemCount = order.lines.reduce(
    (n, line) => n + (line.isWeight ? 1 : line.qty),
    0,
  );
  const amount = order.totalDue + deliveryFee(order);

  const riderFallback = {
    name: "Abhinav Aneesh",
    initial: "A",
    phone: "+91 98765 01234",
  };
  // OFD + delivered: keep partner name. Call UI is hidden when delivered.
  const rider =
    phase === "out_for_delivery" || phase === "delivered"
      ? (order.rider ?? riderFallback)
      : null;

  return {
    phase,
    shopName,
    billNo: `#${order.number}`,
    trackingId: order.number,
    statusBadge: copy.badge,
    statusMessage: copy.message,
    receiver: order.receiverName ?? "Customer",
    contact: order.contactPhone ?? SAMPLE_CONTACT,
    shopContact: order.shopContact ?? SHOP_CONTACT,
    itemCount: Math.round(itemCount),
    amount: Math.round(amount),
    lines: order.lines.map((line) => {
      const product = getSampleProduct(line.productId);
      return {
        name: product?.name ?? "Item",
        qty: line.qty,
        price: line.lineTotal,
        qtyLabel: orderLineLabel(line, product?.unit),
      };
    }),
    rider,
    headerSteps: buildHeaderSteps(order, phase),
    progress: buildProgress(order, phase),
    mapOrigin: order.mapOrigin ?? MAP_ORIGIN,
    mapDestination: order.mapDestination ?? MAP_DESTINATION,
  };
}
