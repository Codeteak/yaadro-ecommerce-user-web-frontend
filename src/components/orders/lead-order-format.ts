import { getSampleProduct } from "@/lib/sample-products";
import {
  type OrderStatus,
  type SampleOrder,
  type SampleOrderLine,
} from "@/lib/sample-orders";

export type LeadProgress = "placed" | "on_the_way" | "delivered" | "rejected";

export function leadProgress(status: OrderStatus): LeadProgress {
  if (status === "cancelled") return "rejected";
  if (status === "delivered") return "delivered";
  if (status === "out_for_delivery" || status === "packed") return "on_the_way";
  return "placed";
}

export function leadStepIndex(progress: LeadProgress): number {
  if (progress === "placed") return 0;
  if (progress === "on_the_way") return 1;
  return 2;
}

export function leadStatusLabel(progress: LeadProgress, status: OrderStatus): string {
  if (progress === "placed") return "Order placed";
  if (progress === "on_the_way") return "On the way";
  if (progress === "delivered") return "Delivered";
  return status === "cancelled" ? "Cancelled" : "Rejected";
}

export function leadStatusInk(progress: LeadProgress): string {
  if (progress === "on_the_way") return "#2563EB";
  if (progress === "rejected") return "#DC2626";
  return "#3d8f3d";
}

export function inr(amount: number): string {
  return `₹${Math.round(amount)}`;
}

export function orderItemCount(order: SampleOrder): number {
  return order.lines.reduce((n, line) => n + (line.isWeight ? 1 : line.qty), 0);
}

export function lineName(line: SampleOrderLine): string {
  return line.name ?? getSampleProduct(line.productId)?.name ?? "Item";
}

/** Sample orders use a placeholder fee. Live orders use the shop's fee. */
export function deliveryCharge(order: SampleOrder): number {
  if (typeof order.deliveryFee === "number") return order.deliveryFee;
  return order.status === "cancelled" ? 0 : 25;
}

export function billedTotal(order: SampleOrder): number {
  const ship = deliveryCharge(order);
  // Prefer derived total when API total still equals subtotal despite a promo.
  if (order.promoDiscount > 0 && order.totalDue >= order.subtotal) {
    return Math.max(0, order.subtotal - order.promoDiscount) + ship;
  }
  // Live orders set deliveryFee; totalDue is usually the payable amount.
  if (typeof order.deliveryFee === "number") return order.totalDue;
  return order.totalDue + ship;
}

export function clockish(at?: string): string {
  if (!at) return "";
  const parts = at.split("·");
  return (parts[1] ?? parts[0]).trim();
}
