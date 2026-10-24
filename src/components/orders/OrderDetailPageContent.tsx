"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  ClipboardList,
  House,
  MapPin,
  Motorbike,
  Package,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { getOrder, listOrders } from "@/lib/api/orders";
import { getSampleProduct } from "@/lib/sample-products";
import {
  buildOrderProgress,
  orderLineLabel,
  type OrderProgressId,
  type SampleOrder,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

/** Lucide icons (common SVG set) — black stroke via currentColor. */
const PROGRESS_ICONS: Record<OrderProgressId, LucideIcon> = {
  received: ClipboardList,
  confirmed: BadgeCheck,
  processed: Package,
  shipped: Motorbike,
  delivered: House,
  cancelled: X,
};

type OrderDetailPageContentProps = {
  chromePosition?: "page" | "inline";
  orderId?: string;
};

/**
 * Order detail: vertical ORDER STATUS, items, totals.
 * Data from `getOrder()` until a real orders API exists.
 */
export function OrderDetailPageContent({
  chromePosition = "page",
  orderId,
}: OrderDetailPageContentProps) {
  const inline = chromePosition === "inline";
  const id = orderId ?? "";
  const order = id ? getOrder(id) : listOrders()[0];
  const backHref = inline ? "/playground/orders-list" : "/orders";

  if (!order) {
    return (
      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
          inline ? "min-h-full" : "min-h-dvh",
        )}
      >
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

  return <OrderDetailBody order={order} backHref={backHref} inline={inline} />;
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
  const cancelled = order.status === "cancelled";
  const itemSavings = Math.max(0, order.mrpTotal - order.subtotal);
  const totalSaved = itemSavings + order.promoDiscount;
  const steps = buildOrderProgress(order);

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper",
        inline ? "min-h-full" : "min-h-dvh",
      )}
    >
      <div className="px-5">
        <PageHeader backHref={backHref} title={order.number} />
      </div>

      <PullToRefresh className="flex flex-1 flex-col px-5 pb-8">
        <section className="mt-2 rounded-[1.75rem] bg-white px-4 py-5 shadow-[0_12px_32px_rgba(47,107,47,0.12)] ring-1 ring-forest/10">
          <h2 className="px-1 text-[13px] font-extrabold tracking-[0.14em] text-black uppercase">
            Order status
          </h2>

          <ol className="mt-4 flex flex-col gap-3">
            {steps.map((step, i) => {
              const isCancelStep = step.id === "cancelled";
              const active = step.done;
              const isCurrent = step.current;
              const showConnector = i < steps.length - 1;
              const next = steps[i + 1];
              const nextDone = next?.done ?? false;
              const nextIsCancel = next?.id === "cancelled";
              const StepIcon = PROGRESS_ICONS[step.id];

              return (
                <li key={step.id} className="relative flex gap-3">
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5",
                      isCancelStep
                        ? "bg-red-50 ring-1 ring-dashed ring-red-300"
                        : active
                          ? "bg-mint"
                          : "bg-black/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center",
                        isCancelStep
                          ? "rounded-full bg-red-500 text-white"
                          : "text-black",
                      )}
                    >
                      <StepIcon
                        className={cn(
                          isCancelStep ? "h-5 w-5 stroke-[2.5]" : "h-7 w-7",
                          !active && !isCancelStep && "opacity-40",
                        )}
                        strokeWidth={isCancelStep ? undefined : 2}
                        aria-hidden
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] leading-tight",
                          isCancelStep
                            ? "font-bold text-red-700"
                            : active
                              ? "text-forest"
                              : "text-muted",
                        )}
                      >
                        {isCancelStep ? (
                          "Order cancelled"
                        ) : (
                          <>
                            {step.eyebrow}{" "}
                            <span className="font-extrabold text-black">
                              {step.title}
                            </span>
                          </>
                        )}
                      </p>
                      {step.at && active ? (
                        <p
                          className={cn(
                            "mt-0.5 text-[11px] font-medium",
                            isCancelStep ? "text-red-600/80" : "text-muted",
                          )}
                        >
                          {step.at}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative flex w-7 shrink-0 flex-col items-center pt-3">
                    <span
                      className={cn(
                        "relative z-10 grid h-6 w-6 place-items-center rounded-full",
                        isCancelStep
                          ? "bg-red-500 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
                          : active
                            ? isCurrent
                              ? "bg-leaf text-white shadow-[0_0_0_3px_rgba(92,184,92,0.25)]"
                              : "bg-white text-leaf ring-2 ring-leaf"
                            : "bg-black/[0.08] text-transparent",
                      )}
                      aria-hidden
                    >
                      {isCancelStep ? (
                        <X className="h-3.5 w-3.5 stroke-[3]" />
                      ) : active ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-black/20" />
                      )}
                    </span>
                    {showConnector ? (
                      <span
                        className={cn(
                          "absolute top-9 bottom-[-0.75rem] w-0.5 rounded-full",
                          active && nextDone
                            ? nextIsCancel
                              ? "bg-red-300"
                              : "bg-leaf"
                            : "bg-black/10",
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-5">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-sm font-bold text-black">
                  {order.addressLabel}
                </p>
                <span className="text-[12px] font-semibold text-forest">
                  · {order.paymentLabel}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">
                {order.addressDetail}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-extrabold text-black">
            Items ({order.lines.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {order.lines.map((line) => {
              const product = getSampleProduct(line.productId);
              if (!product) return null;
              return (
                <li
                  key={`${order.id}-${line.productId}`}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(47,107,47,0.08)] ring-1 ring-forest/8"
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
                      {product.unit}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[12px] font-extrabold text-forest">
                    {orderLineLabel(line)}
                  </span>
                  <div className="w-14 shrink-0 text-right">
                    <p className="text-sm font-extrabold text-black">
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
