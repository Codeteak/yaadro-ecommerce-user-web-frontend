"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { getSampleProduct } from "@/lib/sample-products";
import {
  listSampleOrders,
  orderStatusChip,
  type SampleOrder,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

type OrdersPageContentProps = {
  chromePosition?: "page" | "inline";
  /** Override list (playground empty demo). Default = sample orders. */
  orders?: SampleOrder[];
};

/**
 * Order history list — sample data until orders API exists.
 */
export function OrdersPageContent({
  chromePosition = "page",
  orders,
}: OrdersPageContentProps) {
  const inline = chromePosition === "inline";
  const list = orders ?? listSampleOrders();
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
          <ul className="flex flex-col gap-3 pt-2 pb-8">
            {list.map((order) => {
              const chip = orderStatusChip(order.status);
              const thumbs = order.lines
                .map((l) => getSampleProduct(l.productId))
                .filter(Boolean)
                .slice(0, 3);
              const extra = order.lines.length - thumbs.length;

              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="block rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10 transition hover:ring-leaf/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Image
                          src="/orders/order-list-icon.svg"
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="mt-0.5 h-7 w-7 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-black">
                            {order.number}
                          </p>
                          <p className="mt-0.5 text-[13px] text-muted">
                            {order.placedAtLabel}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
                          chip.className,
                        )}
                      >
                        {chip.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {thumbs.map((p) =>
                          p ? (
                            <span
                              key={p.id}
                              className="relative h-11 w-11 overflow-hidden rounded-xl bg-mint ring-2 ring-white"
                            >
                              <Image
                                src={p.image}
                                alt=""
                                fill
                                className="object-contain p-1"
                                sizes="44px"
                              />
                            </span>
                          ) : null,
                        )}
                      </div>
                      {extra > 0 ? (
                        <span className="text-[13px] font-semibold text-muted">
                          +{extra} more
                        </span>
                      ) : null}
                      <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-leaf">
                        ₹{order.totalDue}
                        <ChevronRight
                          className="h-4 w-4 text-muted"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PullToRefresh>
    </main>
  );
}
