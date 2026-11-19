"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StorefrontPageFrame } from "@/components/storefront/StorefrontPageFrame";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { listOrders } from "@/lib/api/orders";
import { listCustomerOrders } from "@/lib/api/customer-orders";
import { ApiError } from "@/lib/api/errors";
import {
  OrderHistoryCard,
  OrderReceiptDialog,
  OrderReviewSheet,
  OrderTicketBill,
} from "@/components/orders/lead-order-shared";
import type { SampleOrder } from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

export type OrdersPageContentProps = {
  orders?: SampleOrder[];
  /** Build detail href. Storefront default is `/orders/[id]`. */
  detailHref?: (orderId: string) => string;
  shopHref?: string;
  backHref?: string;
  /** `inline` drops the full-viewport height for the playground frame. */
  chromePosition?: "page" | "inline";
  /** Centered ticket bill with download. On for storefront and playground. */
  ticketBill?: boolean;
  /** Load the signed-in customer's orders from the shop. Playground stays on samples. */
  live?: boolean;
  /**
   * Playground: force guest vs signed-in empty without a real session.
   * Omit on storefront to use `hasCustomerSession`.
   */
  previewSignedIn?: boolean;
  /** Playground Phase A (#21): status badge + pulse on cards. */
  highlightStatus?: boolean;
  /** Playground: show parcel + order id instead of address. */
  showOrderId?: boolean;
  className?: string;
};

/**
 * Order history cards for `/orders`.
 * Data from `listOrders()` sample façade.
 */
export function OrdersPageContent({
  orders,
  detailHref = (id) => `/orders/${id}`,
  shopHref = "/home",
  backHref = "/profile",
  chromePosition = "page",
  ticketBill = true,
  live = false,
  previewSignedIn,
  highlightStatus = false,
  showOrderId = false,
  className,
}: OrdersPageContentProps) {
  const inline = chromePosition === "inline";
  const sessionSignedIn = useCustomerSignedIn();
  const signedIn = previewSignedIn ?? sessionSignedIn;
  const account = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) => listCustomerOrders(signal),
    enabled: live && signedIn && previewSignedIn === undefined,
  });
  const list = live
    ? previewSignedIn === false
      ? []
      : (account.data ?? [])
    : (orders ?? listOrders());
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [billFor, setBillFor] = useState<SampleOrder | null>(null);
  const loginHref = "/login?next=/orders";
  const showGuest = (live || previewSignedIn === false) && !signedIn;

  return (
    <StorefrontPageFrame
      title="Orders"
      backHref={backHref}
      height={inline ? "embed" : "page"}
      className={cn("pb-8", className)}
    >
      <div className="px-5">
        {showGuest ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <Image
              src="/orders/empty-orders-v2.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-52 max-w-full"
              priority={!inline}
            />
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">
              Sign in to see your orders
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              Track deliveries and download bills after you sign in.
            </p>
            <Link
              href={loginHref}
              className="mt-6 inline-flex h-12 min-w-40 items-center justify-center rounded-full bg-track px-7 text-base font-bold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Sign in
            </Link>
          </div>
        ) : live && account.isPending ? (
          <div className="mt-4 h-28 animate-pulse rounded-2xl bg-mint/50" />
        ) : live && account.isError ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-muted">
              {account.error instanceof ApiError
                ? account.error.message
                : "We couldn't load your orders. Check your connection and try again."}
            </p>
            <button
              type="button"
              onClick={() => void account.refetch()}
              className="mt-4 text-sm font-bold text-leaf"
            >
              Try again
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Image
              src="/orders/empty-orders-v2.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-52 max-w-full"
              priority={!inline}
            />
            <p className="mt-5 text-[22px] font-extrabold tracking-tight text-black">
              No orders yet
            </p>
            <p className="mt-2 max-w-xs text-sm font-medium text-muted">
              When you place an order, it will show up here with live status.
            </p>
            <Link
              href={shopHref}
              className="mt-6 inline-flex h-12 min-w-40 items-center justify-center rounded-full bg-track px-7 text-base font-bold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {list.map((order) => (
              <li key={order.id}>
                <OrderHistoryCard
                  order={order}
                  href={detailHref(order.id)}
                  onReview={() => setReviewFor(order.id)}
                  onDownloadBill={() => setBillFor(order)}
                  highlightStatus={highlightStatus}
                  showOrderId={showOrderId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {reviewFor ? <OrderReviewSheet onClose={() => setReviewFor(null)} /> : null}
      {billFor ? (
        ticketBill ? (
          <OrderTicketBill order={billFor} onClose={() => setBillFor(null)} />
        ) : (
          <OrderReceiptDialog order={billFor} onClose={() => setBillFor(null)} />
        )
      ) : null}
    </StorefrontPageFrame>
  );
}
