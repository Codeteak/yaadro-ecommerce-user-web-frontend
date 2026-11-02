"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Package,
  Search,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { listOrders } from "@/lib/api/orders";
import { getSampleProduct } from "@/lib/sample-products";
import {
  orderMatchesListFilter,
  type OrderListFilter,
  type OrderStatus,
  type SampleOrder,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

const FILTERS: { id: OrderListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function listBadge(status: OrderStatus): {
  label: string;
  Icon: LucideIcon;
  className: string;
} {
  if (status === "delivered") {
    return {
      label: "Delivered",
      Icon: Check,
      className: "bg-mint text-forest",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      Icon: X,
      className: "bg-red-50 text-red-700",
    };
  }
  if (status === "out_for_delivery") {
    return {
      label: "Out for Delivery",
      Icon: Truck,
      className: "bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "Processing",
    Icon: Package,
    className: "bg-amber-50 text-amber-800",
  };
}

export type OrdersListPlaygroundProps = {
  orders?: SampleOrder[];
  /** Build detail href (playground → order-detail?id=). */
  detailHref?: (orderId: string) => string;
  className?: string;
};

/**
 * Redesigned My Orders list — playground only until wired to `/orders`.
 * Data still from `listOrders()` sample façade.
 */
export function OrdersListPlayground({
  orders,
  detailHref = (id) => `/playground/order-detail?id=${id}`,
  className,
}: OrdersListPlaygroundProps) {
  const source = orders ?? listOrders();
  const [filter, setFilter] = useState<OrderListFilter>("all");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((order) => {
      if (!orderMatchesListFilter(order, filter)) return false;
      if (!q) return true;
      if (order.number.toLowerCase().includes(q)) return true;
      if (order.id.toLowerCase().includes(q)) return true;
      return order.lines.some((line) => {
        const p = getSampleProduct(line.productId);
        return p?.name.toLowerCase().includes(q);
      });
    });
  }, [source, filter, query]);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-lg flex-col bg-paper",
        className,
      )}
    >
      <header className="relative overflow-hidden bg-gradient-to-b from-mint via-[#e7f5e7] to-paper px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div
          className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-leaf/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <Image
                src="/onboarding/brand-logo.png"
                alt="Yaadro"
                width={120}
                height={36}
                className="h-8 w-auto"
                priority
              />
            </div>
            <p className="mt-1 text-[12px] font-medium text-forest/80">
              Freshness at your doorstep
            </p>
          </div>
          <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
            <Image
              src="/orders/orders-hero-bag.jpg"
              alt=""
              fill
              className="object-contain object-bottom drop-shadow-[0_12px_24px_rgba(47,107,47,0.28)]"
              sizes="128px"
              priority
            />
          </div>
        </div>

        <label className="relative mt-2 block">
          <span className="sr-only">Search orders</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your orders…"
            className="h-11 w-full rounded-full bg-white pr-4 pl-10 text-[14px] font-medium text-ink shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-black/[0.06] outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-leaf"
          />
        </label>
      </header>

      <div className="px-5 pt-4">
        <h1 className="text-[1.375rem] font-bold tracking-tight text-ink">
          My Orders
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Track and manage your orders
        </p>

        <div
          className="mt-3 flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Order status"
        >
          {FILTERS.map((chip) => {
            const on = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(chip.id)}
                className={cn(
                  "h-9 shrink-0 cursor-pointer rounded-full px-4 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                  on
                    ? "bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.22)]"
                    : "bg-white text-leaf ring-1 ring-black/[0.08]",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-8">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-mint text-forest">
              <Package className="h-8 w-8" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-ink">
              {source.length === 0 ? "No orders yet" : "No matching orders"}
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              {source.length === 0
                ? "When you place an order, it will show up here with live status."
                : "Try another filter or clear your search."}
            </p>
            {source.length === 0 ? (
              <Link
                href="/playground"
                className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Back to playground
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
                className="mt-6 inline-flex h-12 cursor-pointer items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} href={detailHref(order.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, href }: { order: SampleOrder; href: string }) {
  const badge = listBadge(order.status);
  const BadgeIcon = badge.Icon;
  const products = order.lines
    .map((l) => getSampleProduct(l.productId))
    .filter(Boolean);
  const extra = Math.max(0, products.length - 3);
  const thumbs = products.slice(0, 3);

  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className="block rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/8 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            badge.className,
          )}
        >
          <BadgeIcon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold text-ink">
                #{order.number}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {order.placedAtLabel}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex -space-x-2">
                {thumbs.map((p) =>
                  p ? (
                    <span
                      key={p.id}
                      className="relative h-10 w-10 overflow-hidden rounded-lg bg-paper ring-2 ring-white"
                    >
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        className="object-contain p-0.5"
                        sizes="40px"
                      />
                    </span>
                  ) : null,
                )}
                {extra > 0 ? (
                  <span className="relative z-10 grid h-10 w-10 place-items-center rounded-lg bg-mint text-[12px] font-extrabold text-forest ring-2 ring-white">
                    +{extra}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] font-semibold text-muted">
                {order.lines.length}{" "}
                {order.lines.length === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-[15px] font-extrabold tabular-nums text-ink">
                ₹{order.totalDue}
              </p>
              <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
