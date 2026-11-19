"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { LiveOrderTrack } from "@/components/orders/LiveOrderTrack";
import { useShopName } from "@/components/shop/ShopNameProvider";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { getCustomerOrder } from "@/lib/api/customer-orders";
import { ApiError } from "@/lib/api/errors";
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
 * Sample ids use local data; live UUIDs load via `getCustomerOrder` (same as details).
 * Pre-partner phases keep the track page with waiting copy.
 */
export function OrderLiveTrackPage({
  orderId,
  backHref,
  className,
}: OrderLiveTrackPageProps) {
  const shopName = useShopName();
  const detailHref = backHref ?? `/orders/${orderId}`;
  const sampleOrder = getOrder(orderId);
  const signedIn = useCustomerSignedIn();
  const remote = useQuery({
    queryKey: ["order", orderId],
    queryFn: ({ signal }) => getCustomerOrder(orderId, signal),
    enabled: !sampleOrder && signedIn,
  });
  const order = sampleOrder ?? remote.data ?? null;

  if (!sampleOrder && !signedIn) {
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
          <Link
            href={`/login?next=/orders/${orderId}/track`}
            className="font-bold text-leaf"
          >
            Sign in
          </Link>{" "}
          to track this order.
        </p>
      </div>
    );
  }

  if (!sampleOrder && remote.isPending) {
    return <div className="m-5 h-40 animate-pulse rounded-2xl bg-mint/50" />;
  }

  if (!sampleOrder && remote.isError) {
    const message =
      remote.error instanceof ApiError
        ? remote.error.message
        : "We couldn't load tracking for this order. Try again.";
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
        <p className="mt-10 text-center text-sm font-semibold text-muted">
          {message}
        </p>
        <button
          type="button"
          onClick={() => void remote.refetch()}
          className="mx-auto mt-4 text-sm font-bold text-leaf"
        >
          Try again
        </button>
      </div>
    );
  }

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
      order={order}
      backHref={detailHref}
      className={className}
    />
  );
}
