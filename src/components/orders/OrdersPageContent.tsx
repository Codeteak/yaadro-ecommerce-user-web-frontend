"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Package,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { getSampleProduct } from "@/lib/sample-products";
import { listOrders } from "@/lib/api/orders";
import { type OrderStatus, type SampleOrder } from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

type OrdersPageContentProps = {
  chromePosition?: "page" | "inline";
  /** Override list (playground empty demo). Default = orders API façade. */
  orders?: SampleOrder[];
};

function orderListStatus(status: OrderStatus): {
  label: string;
  Icon: LucideIcon;
  className: string;
} {
  if (status === "delivered") {
    return {
      label: "Delivered",
      Icon: Check,
      className: "bg-mint text-forest ring-1 ring-leaf/25",
    };
  }
  if (status === "out_for_delivery") {
    return {
      label: "Out for Delivery",
      Icon: Truck,
      className: "bg-mint/70 text-forest ring-1 ring-leaf/20",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      Icon: X,
      className: "bg-red-50 text-red-700 ring-1 ring-dashed ring-red-400/80",
    };
  }
  return {
    label: "Processing",
    Icon: Package,
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
}

/**
 * Order history list. Data from `listOrders()` until a real orders API exists.
 */
export function OrdersPageContent({
  chromePosition = "page",
  orders,
}: OrdersPageContentProps) {
  const inline = chromePosition === "inline";
  const list = orders ?? listOrders();
  const backHref = inline ? "/playground" : "/profile";

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "min-h-full" : "min-h-dvh",
      )}
    >
      <PageHeader backHref={backHref} title="Orders" />

      <PullToRefresh className="flex flex-1 flex-col">
        {list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-mint text-forest">
              <Package className="h-8 w-8" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-ink">
              No orders yet
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              When you place an order, it will show up here with live status.
            </p>
            <Link
              href={inline ? "/playground" : "/home"}
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4 pt-2 pb-8">
            {list.map((order) => (
              <li key={order.id}>
                <OrderListCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </PullToRefresh>
    </main>
  );
}

function OrderListCard({ order }: { order: SampleOrder }) {
  const status = orderListStatus(order.status);
  const StatusIcon = status.Icon;
  const products = order.lines
    .map((l) => getSampleProduct(l.productId))
    .filter(Boolean);
  const extra = Math.max(0, products.length - 3);
  const thumbs = extra > 0 ? products.slice(0, 3) : products.slice(0, 4);

  return (
    <Link
      href={`/orders/${order.id}`}
      transitionTypes={["nav-forward"]}
      className="group block rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(47,107,47,0.1)] ring-1 ring-forest/10 transition hover:ring-leaf/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-black">
            Order #{order.number}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            Placed on {order.placedAtLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
              status.className,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden />
            {status.label}
          </span>
          <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {thumbs.map((p) =>
                p ? (
                  <span
                    key={p.id}
                    className="relative h-12 w-12 overflow-hidden rounded-xl bg-paper ring-2 ring-white"
                  >
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                    />
                  </span>
                ) : null,
              )}
            </div>
            {extra > 0 ? (
              <span className="relative z-10 -ml-2 grid h-12 w-12 place-items-center rounded-xl bg-mint text-[13px] font-extrabold text-forest ring-2 ring-white">
                +{extra}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-muted">
            {order.lines.length}{" "}
            {order.lines.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-base font-extrabold tabular-nums text-black">
            ₹{order.totalDue}
          </p>
          <span className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-bold text-forest ring-2 ring-leaf transition group-hover:bg-mint">
            View Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
