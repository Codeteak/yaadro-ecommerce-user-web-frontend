"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Clock3,
  House,
  MessageCircle,
  Motorbike,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { getOrder, listOrders } from "@/lib/api/orders";
import { cn } from "@/lib/cn";
import {
  buildOrderProgress,
  orderStatusLabel,
  type OrderProgressId,
  type SampleOrder,
} from "@/lib/sample-orders";

/** Mock-aligned labels for the tracking timeline. */
const TRACK_LABEL: Record<OrderProgressId, { title: string; Icon: LucideIcon }> =
  {
    received: { title: "Order Placed", Icon: ShoppingBag },
    confirmed: { title: "Confirmed", Icon: Check },
    processed: { title: "Packed", Icon: Package },
    shipped: { title: "Out for Delivery", Icon: Truck },
    delivered: { title: "Delivered", Icon: House },
    cancelled: { title: "Cancelled", Icon: X },
  };

function heroCopy(order: SampleOrder): { headline: string; sub: string } {
  if (order.statusHeadline && order.statusSubcopy) {
    return { headline: order.statusHeadline, sub: order.statusSubcopy };
  }
  if (order.status === "cancelled") {
    return {
      headline: "Cancelled",
      sub: "This order was cancelled. Contact support if you need help.",
    };
  }
  if (order.status === "delivered") {
    return {
      headline: "Delivered",
      sub: "Your order has been delivered. Enjoy your groceries!",
    };
  }
  if (order.status === "packed") {
    return {
      headline: "Being packed",
      sub: "We’re packing your items carefully before dispatch.",
    };
  }
  if (order.status === "placed") {
    return {
      headline: "Order placed",
      sub: "We’ve received your order and will confirm it shortly.",
    };
  }
  return {
    headline: "On the way",
    sub: "Your order is out for delivery and will reach you soon!",
  };
}

type OrderTrackingPageContentProps = {
  chromePosition?: "page" | "inline";
  orderId?: string;
  backHref?: string;
};

/**
 * Order status tracking UI (hero + timeline + partner).
 * Playground first — wire into `/orders/[id]` when approved.
 */
export function OrderTrackingPageContent({
  chromePosition = "page",
  orderId,
  backHref: backHrefProp,
}: OrderTrackingPageContentProps) {
  const inline = chromePosition === "inline";
  const id = orderId ?? "";
  const order = id ? getOrder(id) : listOrders()[0];
  const backHref =
    backHrefProp ?? (inline ? "/playground/orders-list" : "/orders");

  if (!order) {
    return (
      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
          inline ? "min-h-full" : "min-h-dvh",
        )}
      >
        <PageHeader backHref={backHref} title="Order Status" />
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
    <OrderTrackingBody order={order} backHref={backHref} inline={inline} />
  );
}

function OrderTrackingBody({
  order,
  backHref,
  inline,
}: {
  order: SampleOrder;
  backHref: string;
  inline: boolean;
}) {
  const steps = buildOrderProgress(order);
  const { headline, sub } = heroCopy(order);
  const partner = order.deliveryPartner;
  const showPartner =
    Boolean(partner) &&
    (order.status === "out_for_delivery" || order.status === "delivered");
  const cancelled = order.status === "cancelled";

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-[#f7f4ef]",
        inline ? "min-h-full" : "min-h-dvh",
      )}
    >
      <div className="px-5">
        <PageHeader backHref={backHref} title="Order Status" />
        <p className="-mt-1 pb-2 text-center text-[13px] font-medium text-muted">
          Track your order in real-time
        </p>
      </div>

      <PullToRefresh className="flex flex-1 flex-col px-5 pb-10">
        {/* Hero */}
        <section className="relative mt-1 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-mint/80 via-[#eef6ee] to-paper px-5 pt-5 pb-4">
          <div className="relative z-10 max-w-[58%]">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-track px-2.5 py-1 text-[11px] font-extrabold text-black shadow-sm">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Order #{order.number.replace(/^YAD-/, "")}
            </p>
            <h2 className="mt-3 flex items-center gap-2 text-[1.75rem] leading-tight font-extrabold tracking-tight text-forest">
              {headline}
              {!cancelled && order.status !== "delivered" ? (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-leaf shadow-[0_0_0_4px_rgba(47,107,47,0.2)]"
                  aria-hidden
                />
              ) : null}
            </h2>
            <p className="mt-2 text-[13px] leading-5 font-medium text-muted">
              {sub}
            </p>
            {order.etaLabel && !cancelled ? (
              <p className="mt-4 inline-flex max-w-full items-start gap-2 rounded-2xl bg-mint/90 px-3 py-2.5 text-[12px] leading-snug font-semibold text-forest ring-1 ring-leaf/20">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Expected delivery{" "}
                  <span className="font-extrabold">{order.etaLabel}</span>
                </span>
              </p>
            ) : null}
          </div>

          <div
            className="pointer-events-none absolute -right-2 bottom-0 flex h-[9.5rem] w-[9.5rem] items-end justify-center sm:h-44 sm:w-44"
            aria-hidden
          >
            <span className="absolute inset-4 rounded-full bg-leaf/15 blur-xl" />
            <Motorbike className="relative mb-3 h-24 w-24 text-leaf drop-shadow-[0_8px_16px_rgba(47,107,47,0.35)] sm:h-28 sm:w-28" strokeWidth={1.25} />
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-5 rounded-[1.75rem] bg-white px-4 py-5 shadow-[0_12px_32px_rgba(47,107,47,0.1)] ring-1 ring-forest/8">
          <ol className="flex flex-col">
            {steps.map((step, i) => {
              const meta = TRACK_LABEL[step.id];
              const Icon = meta.Icon;
              const isCancel = step.id === "cancelled";
              const showConnector = i < steps.length - 1;
              const next = steps[i + 1];
              const connectorDone = step.done && (next?.done ?? false);
              const isLive =
                step.current &&
                step.id === "shipped" &&
                order.status === "out_for_delivery";

              return (
                <li key={step.id} className="relative flex gap-3">
                  <div className="relative flex w-11 shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "relative z-10 grid h-11 w-11 place-items-center rounded-full",
                        isCancel
                          ? "bg-red-500 text-white"
                          : step.done
                            ? "bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.28)]"
                            : "bg-black/[0.06] text-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          !step.done && !isCancel && "opacity-50",
                        )}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </span>
                    {showConnector ? (
                      <span
                        className={cn(
                          "absolute top-11 bottom-0 w-0.5 rounded-full",
                          connectorDone
                            ? isCancel || next?.id === "cancelled"
                              ? "bg-red-300"
                              : "bg-leaf"
                            : "border-l-2 border-dashed border-black/15 bg-transparent w-0",
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "mb-3 min-w-0 flex-1 rounded-2xl px-3 py-3",
                      isLive
                        ? "bg-mint/80 ring-1 ring-leaf/25"
                        : isCancel
                          ? "bg-red-50 ring-1 ring-dashed ring-red-300"
                          : "bg-transparent",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[15px] font-bold leading-tight",
                            isCancel
                              ? "text-red-700"
                              : step.done
                                ? "text-ink"
                                : "text-muted",
                          )}
                        >
                          {meta.title}
                        </p>
                        {step.at && (step.done || step.current) ? (
                          <p
                            className={cn(
                              "mt-0.5 text-[12px] font-medium",
                              isCancel ? "text-red-600/80" : "text-muted",
                            )}
                          >
                            {step.at}
                          </p>
                        ) : step.id === "delivered" && order.etaLabel && !step.done ? (
                          <p className="mt-0.5 text-[12px] font-medium text-muted">
                            Expected {order.etaLabel}
                          </p>
                        ) : null}
                      </div>

                      {step.done && !step.current && !isCancel ? (
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leaf text-white"
                          aria-hidden
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      ) : null}
                      {isLive ? (
                        <button
                          type="button"
                          className="shrink-0 cursor-pointer rounded-full bg-track px-3 py-1.5 text-[11px] font-extrabold text-black shadow-sm transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                          onClick={() => {
                            /* UI stub — live map when courier API lands */
                          }}
                        >
                          Live Tracking ›
                        </button>
                      ) : null}
                      {step.current && isCancel ? (
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-500 text-white"
                          aria-hidden
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      ) : null}
                      {!step.done && !isCancel ? (
                        <span
                          className="mt-1 h-5 w-5 shrink-0 rounded-full ring-2 ring-black/15"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-1 px-1 text-[11px] font-medium text-muted">
            Status: {orderStatusLabel(order.status)} · sample tracking
          </p>
        </section>

        {/* Delivery partner */}
        {showPartner && partner ? (
          <section className="mt-5 rounded-[1.75rem] bg-[#efe8dc] px-4 py-4 ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-mint ring-2 ring-white">
                {partner.avatar ? (
                  <Image
                    src={partner.avatar}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-sm font-extrabold text-forest">
                    {partner.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-ink">
                  {partner.name}
                </p>
                <p className="text-[12px] font-semibold text-muted">
                  {partner.role ?? "Delivery Partner"}
                </p>
                <p className="mt-0.5 text-[12px] font-bold tracking-wide text-forest">
                  {partner.vehicle}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={partner.phone ? `tel:${partner.phone}` : undefined}
                  aria-label={`Call ${partner.name}`}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-black/[0.06] transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  onClick={(e) => {
                    if (!partner.phone) e.preventDefault();
                  }}
                >
                  <Phone className="h-5 w-5" aria-hidden />
                </a>
                <button
                  type="button"
                  aria-label={`Message ${partner.name}`}
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-black/[0.06] transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  onClick={() => {
                    /* UI stub — chat when messaging API lands */
                  }}
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            {/* Mini map stub */}
            <div className="relative mt-4 h-36 overflow-hidden rounded-2xl bg-[#dce8dc] ring-1 ring-forest/10">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(47,107,47,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(47,107,47,0.12) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
                aria-hidden
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 320 144"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M40 110 C 90 100, 120 40, 180 55 S 260 90, 280 40"
                  fill="none"
                  stroke="#2f6b2f"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute bottom-8 left-8 grid h-9 w-9 place-items-center rounded-full bg-track text-black shadow-md">
                <Motorbike className="h-4 w-4" aria-hidden />
              </span>
              <span className="absolute top-6 right-10 grid h-9 w-9 place-items-center rounded-full bg-white text-leaf shadow-md ring-2 ring-leaf/30">
                <House className="h-4 w-4" aria-hidden />
              </span>
              {typeof partner.distanceKm === "number" ? (
                <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-forest shadow-sm">
                  {partner.distanceKm} km away
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        <p className="mt-6 text-center text-[12px] font-medium text-muted">
          Sample courier data — live map & chat when APIs land.
        </p>
      </PullToRefresh>
    </main>
  );
}
