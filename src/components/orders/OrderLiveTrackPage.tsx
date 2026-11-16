"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LiveOrderTrack } from "@/components/orders/LiveOrderTrack";
import { useShopName } from "@/components/shop/ShopNameProvider";
import { getOrder } from "@/lib/api/orders";
import { toLiveOrderTrackSample } from "@/lib/order-live-track";
import { cn } from "@/lib/cn";

type OrderLiveTrackPageProps = {
  orderId: string;
  /** Usually the classic order detail for this id. */
  backHref?: string;
  className?: string;
};

/**
 * Ecom live tracking page for one order.
 * Separate from classic `/orders/[id]` order details.
 * Cancelled / unmapped orders show a short message + back link.
 */
export function OrderLiveTrackPage({
  orderId,
  backHref,
  className,
}: OrderLiveTrackPageProps) {
  const shopName = useShopName();
  const order = getOrder(orderId);
  const detailHref = backHref ?? `/orders/${orderId}`;

  if (!order) {
    return (
      <div className={cn("flex min-h-full flex-col bg-paper px-5", className)}>
        <div className="pt-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm font-bold text-forest"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Orders
          </Link>
        </div>
        <p className="py-16 text-center text-sm font-semibold text-muted">
          Order not found
        </p>
      </div>
    );
  }

  const sample = toLiveOrderTrackSample(order, shopName);
  if (!sample) {
    return (
      <div className={cn("flex min-h-full flex-col bg-paper px-5", className)}>
        <div className="pt-3">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-sm font-bold text-forest"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Order details
          </Link>
        </div>
        <p className="mt-10 text-center text-lg font-extrabold text-black">
          Tracking unavailable
        </p>
        <p className="mt-2 px-4 text-center text-sm font-semibold text-muted">
          Live tracking isn’t available for cancelled orders. Open order
          details instead.
        </p>
        <Link
          href={detailHref}
          className="mx-auto mt-6 inline-flex h-12 items-center justify-center rounded-full bg-track px-6 text-[15px] font-extrabold text-black"
        >
          View order details
        </Link>
      </div>
    );
  }

  return (
    <LiveOrderTrack
      sample={sample}
      backHref={detailHref}
      className={className}
    />
  );
}
