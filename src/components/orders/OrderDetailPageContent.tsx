"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, MapPin, Package, X } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { getSampleProduct } from "@/lib/sample-products";
import {
  getSampleOrder,
  listSampleOrders,
  orderLineLabel,
  orderStatusChip,
  orderTimelineIndex,
  type SampleOrder,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

type OrderDetailPageContentProps = {
  chromePosition?: "page" | "inline";
  orderId: string;
};

/**
 * Order detail: timeline, items, totals. Sample data only.
 */
export function OrderDetailPageContent({
  chromePosition = "page",
  orderId,
}: OrderDetailPageContentProps) {
  const inline = chromePosition === "inline";
  const order =
    getSampleOrder(orderId) ?? (inline ? listSampleOrders()[0] : undefined);
  const backHref = inline ? "/playground" : "/orders";

  if (!order) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
        <PageHeader backHref={backHref} title="Order" />
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-muted">Order not found</p>
          <Link
            href={backHref}
            className="mt-4 text-sm font-bold text-leaf underline underline-offset-4"
          >
            Back to orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <OrderDetailBody
      order={order}
      backHref={backHref}
      inline={inline}
    />
  );
}

function OrderDetailBody({
  order,
  backHref,
  inline,
}: {
  order: SampleOrder;
  backHref: string;
  inline: boolean;
}) {
  const chip = orderStatusChip(order.status);
  const activeIdx = orderTimelineIndex(order.status);
  const cancelled = order.status === "cancelled";
  const itemSavings = Math.max(0, order.mrpTotal - order.subtotal);
  const totalSaved = itemSavings + order.promoDiscount;

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "min-h-full" : "min-h-dvh",
      )}
    >
      <PageHeader backHref={backHref} title={order.number} />

      <PullToRefresh className="flex flex-1 flex-col pb-8">
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[13px] text-muted">{order.placedAtLabel}</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
              chip.className,
            )}
          >
            {chip.label}
          </span>
        </div>

        <section className="mt-5">
          <h2 className="text-base font-extrabold text-black">Delivery status</h2>
          <ol className="mt-3 rounded-2xl bg-white px-4 py-4 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            {order.timeline.map((step, i) => {
              const isCancelStep = step.key === "cancelled";
              const done = cancelled
                ? isCancelStep || step.key === "placed"
                : i <= activeIdx;
              const current = cancelled
                ? isCancelStep
                : i === activeIdx;
              return (
                <li
                  key={step.key + i}
                  className={cn(
                    "relative flex gap-3 pb-5 last:pb-0",
                    i < order.timeline.length - 1 &&
                      "before:absolute before:top-7 before:left-[11px] before:h-[calc(100%-1.25rem)] before:w-0.5 before:bg-forest/15",
                    done &&
                      i < order.timeline.length - 1 &&
                      !cancelled &&
                      "before:bg-leaf",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      isCancelStep && done
                        ? "bg-red-500 text-white"
                        : done
                          ? "bg-leaf text-white"
                          : "bg-mint text-forest/40 ring-1 ring-forest/10",
                      current && !isCancelStep && "ring-2 ring-leaf/40",
                    )}
                    aria-hidden
                  >
                    {isCancelStep && done ? (
                      <X className="h-3.5 w-3.5 stroke-[3]" />
                    ) : done ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-forest/30" />
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        done ? "text-black" : "text-muted",
                      )}
                    >
                      {step.label}
                    </p>
                    {step.at ? (
                      <p className="mt-0.5 text-[12px] text-muted">{step.at}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-extrabold text-black">
            Delivery address
          </h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-black">{order.addressLabel}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">
                {order.addressDetail}
              </p>
              <p className="mt-2 text-[13px] font-semibold text-forest">
                {order.paymentLabel}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-extrabold text-black">
            Items ({order.lines.length})
          </h2>
          <ul className="mt-3 divide-y divide-forest/8 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            {order.lines.map((line) => {
              const product = getSampleProduct(line.productId);
              if (!product) return null;
              return (
                <li
                  key={`${order.id}-${line.productId}`}
                  className="flex items-center gap-3 px-3.5 py-3"
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                      sizes="56px"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-black">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {orderLineLabel(line)} · {product.unit}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-leaf">
                      ₹{line.lineTotal}
                    </p>
                    {line.lineMrp > line.lineTotal ? (
                      <p className="text-[11px] text-muted line-through">
                        ₹{line.lineMrp}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-extrabold text-black">Price details</h2>
          <div className="mt-3 rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-bold text-black">₹{order.mrpTotal}</span>
            </div>
            {order.promoCode && order.promoDiscount > 0 ? (
              <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                <span className="text-muted">Coupon ({order.promoCode})</span>
                <span className="font-bold text-leaf">
                  −₹{order.promoDiscount}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="text-muted">You save</span>
              <span className="font-bold text-leaf">
                {totalSaved > 0 ? `₹${totalSaved}` : "₹0"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="font-bold text-black">Total</span>
              <span className="font-extrabold text-leaf">₹{order.totalDue}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-track px-5 py-3.5 text-black shadow-[0_10px_28px_rgba(47,107,47,0.28)]">
            <span className="text-sm font-semibold">
              {order.status === "delivered" ? "Amount paid" : "Amount due"}
            </span>
            <span className="text-xl font-extrabold tabular-nums">
              ₹{order.totalDue}
            </span>
          </div>
        </section>

        {!cancelled ? (
          <div className="mt-6 flex flex-col gap-2">
            {order.status !== "delivered" ? (
              <p className="flex items-center justify-center gap-2 text-center text-[13px] font-medium text-muted">
                <Package className="h-4 w-4 text-forest" aria-hidden />
                Sample tracking — no live courier link yet.
              </p>
            ) : (
              <Link
                href={inline ? "/playground" : "/home"}
                className="flex h-12 w-full items-center justify-center rounded-full bg-track text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Order again from shop
              </Link>
            )}
          </div>
        ) : null}
      </PullToRefresh>
    </main>
  );
}
