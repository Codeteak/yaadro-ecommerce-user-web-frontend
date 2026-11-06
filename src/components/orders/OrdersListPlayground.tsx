"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { listOrders } from "@/lib/api/orders";
import {
  OrderHistoryCard,
  OrderReceiptDialog,
  OrderReviewSheet,
  OrderTicketBill,
} from "@/components/orders/lead-order-shared";
import type { SampleOrder } from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

export type OrdersListPlaygroundProps = {
  orders?: SampleOrder[];
  /** Build detail href. Storefront default is `/orders/[id]`. */
  detailHref?: (orderId: string) => string;
  shopHref?: string;
  backHref?: string;
  /** `inline` drops the full-viewport height for the playground frame. */
  chromePosition?: "page" | "inline";
  /** Centered ticket bill with download. On for storefront and playground. */
  ticketBill?: boolean;
  className?: string;
};

/**
 * Order history cards. Used on `/orders` and in the playground.
 * Data from `listOrders()` sample façade.
 */
export function OrdersListPlayground({
  orders,
  detailHref = (id) => `/orders/${id}`,
  shopHref = "/home",
  backHref = "/profile",
  chromePosition = "page",
  ticketBill = true,
  className,
}: OrdersListPlaygroundProps) {
  const inline = chromePosition === "inline";
  const list = orders ?? listOrders();
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [billFor, setBillFor] = useState<SampleOrder | null>(null);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper px-5 pb-8",
        inline ? "min-h-full" : "min-h-dvh",
        className,
      )}
    >
      <PageHeader backHref={backHref} title="Orders" />

      {list.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-mint text-forest">
            <Package className="h-8 w-8" aria-hidden />
          </span>
          <p className="mt-5 text-[22px] font-extrabold tracking-tight text-black">
            No orders yet
          </p>
          <p className="mt-2 max-w-xs text-sm font-medium text-muted">
            When you place an order, it will show up here with live status.
          </p>
          <Link
            href={shopHref}
            className="mt-6 inline-flex h-12 min-w-40 items-center justify-center rounded-full bg-track px-7 text-base font-bold text-black"
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
              />
            </li>
          ))}
        </ul>
      )}

      {reviewFor ? <OrderReviewSheet onClose={() => setReviewFor(null)} /> : null}
      {billFor ? (
        ticketBill ? (
          <OrderTicketBill order={billFor} onClose={() => setBillFor(null)} />
        ) : (
          <OrderReceiptDialog order={billFor} onClose={() => setBillFor(null)} />
        )
      ) : null}
    </div>
  );
}
