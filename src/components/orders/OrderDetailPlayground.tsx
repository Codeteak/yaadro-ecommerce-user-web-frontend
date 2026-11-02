"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Headphones,
  MapPin,
  Package,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { getOrder, listOrders } from "@/lib/api/orders";
import { getSampleProduct } from "@/lib/sample-products";
import {
  buildOrderJourney,
  orderLineLabel,
  type SampleOrder,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

export type OrderDetailPlaygroundProps = {
  orderId?: string;
  backHref?: string;
  className?: string;
};

/**
 * Redesigned Order Details — playground only until wired to `/orders/[id]`.
 * Data from `getOrder()` sample façade.
 */
export function OrderDetailPlayground({
  orderId,
  backHref = "/playground/orders-list",
  className,
}: OrderDetailPlaygroundProps) {
  const order = orderId ? getOrder(orderId) : listOrders()[0];

  if (!order) {
    return (
      <div
        className={cn(
          "mx-auto flex min-h-full w-full max-w-lg flex-col bg-paper px-5",
          className,
        )}
      >
        <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
          <BackButton href={backHref} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-muted">Order not found</p>
          <Link
            href={backHref}
            className="mt-4 text-sm font-bold text-leaf underline underline-offset-4"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <OrderDetailBody
      order={order}
      backHref={backHref}
      className={className}
    />
  );
}

function OrderDetailBody({
  order,
  backHref,
  className,
}: {
  order: SampleOrder;
  backHref: string;
  className?: string;
}) {
  const cancelled = order.status === "cancelled";
  const delivered = order.status === "delivered";
  const journey = buildOrderJourney(order);
  const deliveryFee = order.deliveryFee ?? 0;
  const platformFee = order.platformFee ?? 0;
  const itemSavings = Math.max(0, order.mrpTotal - order.subtotal);

  const statusBanner = cancelled
    ? {
        title: "Cancelled",
        copy: "This order was cancelled. No amount was charged for delivery.",
        className: "bg-red-50 text-red-800 ring-red-200",
        Icon: X,
      }
    : delivered
      ? {
          title: "Delivered",
          copy: "Your order has been delivered successfully.",
          className: "bg-mint text-forest ring-leaf/25",
          Icon: Check,
        }
      : order.status === "out_for_delivery"
        ? {
            title: "Out for delivery",
            copy: "Your order is on the way. Keep your phone handy.",
            className: "bg-amber-50 text-amber-900 ring-amber-200",
            Icon: Truck,
          }
        : {
            title: "Processing",
            copy: "We’re packing your groceries with care.",
            className: "bg-mint/70 text-forest ring-leaf/20",
            Icon: Package,
          };

  const BannerIcon = statusBanner.Icon;

  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-lg flex-col bg-paper",
        className,
      )}
    >
      <header className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <BackButton href={backHref} />
        <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold tracking-tight text-forest">
          Order Details
        </h1>
        <Link
          href="/profile/support"
          aria-label="Contact support"
          className="grid size-11 shrink-0 place-items-center rounded-full text-black transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <Headphones className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      <div className="flex-1 space-y-4 px-5 pb-8">
        {/* Status + horizontal journey */}
        <section
          className={cn(
            "overflow-hidden rounded-[1.5rem] px-4 pt-4 pb-5 text-white shadow-[0_12px_32px_rgba(47,107,47,0.22)]",
            cancelled
              ? "bg-gradient-to-br from-red-600 to-red-700"
              : "bg-gradient-to-br from-leaf to-forest",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold">#{order.number}</p>
              <p className="mt-0.5 text-[12px] text-white/80">
                {order.placedAtLabel}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
              <BannerIcon className="h-3.5 w-3.5" aria-hidden />
              {statusBanner.title}
            </span>
          </div>

          {!cancelled ? (
            <ol className="mt-5 flex items-start justify-between gap-1">
              {journey.map((step, i) => (
                <li
                  key={step.id}
                  className="relative flex min-w-0 flex-1 flex-col items-center text-center"
                >
                  {i > 0 ? (
                    <span
                      className={cn(
                        "absolute top-3 right-1/2 left-[-50%] h-0.5",
                        step.done ? "bg-white" : "bg-white/25",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 grid h-6 w-6 place-items-center rounded-full text-[10px]",
                      step.done
                        ? "bg-white text-forest"
                        : "bg-white/20 text-white/70 ring-1 ring-white/40",
                    )}
                  >
                    {step.done ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    )}
                  </span>
                  <p
                    className={cn(
                      "mt-2 text-[10px] leading-tight font-bold",
                      step.done ? "text-white" : "text-white/60",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.at && step.done ? (
                    <p className="mt-0.5 text-[9px] leading-tight text-white/65">
                      {step.at.replace(/^Today · /, "")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-[13px] leading-5 text-white/90">
              Cancelled after placement — see timeline below.
            </p>
          )}
        </section>

        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl px-3.5 py-3 ring-1",
            statusBanner.className,
          )}
        >
          <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold">{statusBanner.title}</p>
            <p className="mt-0.5 text-[12px] leading-5 opacity-90">
              {statusBanner.copy}
            </p>
          </div>
        </div>

        {/* Summary row */}
        <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-forest/8">
          <div className="min-w-0 px-1">
            <p className="text-[10px] font-bold tracking-wide text-muted uppercase">
              Order total
            </p>
            <p className="mt-1 text-[15px] font-extrabold tabular-nums text-ink">
              ₹{order.totalDue}
            </p>
          </div>
          <div className="min-w-0 border-x border-forest/8 px-2">
            <p className="text-[10px] font-bold tracking-wide text-muted uppercase">
              Payment
            </p>
            <p className="mt-1 flex items-center gap-1 text-[12px] leading-tight font-bold text-ink">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
              <span className="line-clamp-2">{order.paymentLabel}</span>
            </p>
          </div>
          <div className="min-w-0 px-1">
            <p className="text-[10px] font-bold tracking-wide text-muted uppercase">
              Address
            </p>
            <p className="mt-1 line-clamp-3 text-[11px] leading-4 font-semibold text-ink">
              <MapPin className="mr-0.5 inline h-3 w-3 text-leaf" aria-hidden />
              {order.addressDetail}
            </p>
          </div>
        </section>

        {/* Items */}
        <section>
          <h2 className="text-base font-extrabold text-ink">
            Order Items ({order.lines.length})
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
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f4f6f8]">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                      sizes="56px"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {product.unit} · Qty: {orderLineLabel(line)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums text-ink">
                    ₹{line.lineTotal}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-forest/8">
            <Row label="Subtotal" value={`₹${order.subtotal}`} />
            {deliveryFee > 0 ? (
              <Row label="Delivery fee" value={`₹${deliveryFee}`} />
            ) : (
              <Row label="Delivery fee" value="Free" accent />
            )}
            {platformFee > 0 ? (
              <Row label="Platform fee" value={`₹${platformFee}`} />
            ) : null}
            {order.promoCode && order.promoDiscount > 0 ? (
              <Row
                label={`Coupon (${order.promoCode})`}
                value={`−₹${order.promoDiscount}`}
                accent
              />
            ) : null}
            {itemSavings > 0 ? (
              <Row label="Item savings" value={`₹${itemSavings}`} accent />
            ) : null}
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="font-bold text-ink">Total</span>
              <span className="text-base font-extrabold tabular-nums text-leaf">
                ₹{order.totalDue}
              </span>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-base font-extrabold text-ink">Order timeline</h2>
          <ol className="mt-3 space-y-0 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-forest/8">
            {(cancelled
              ? order.timeline
              : order.timeline.filter((s) => s.at || s.key === order.status)
            ).map((step, i, arr) => {
              const done = Boolean(step.at) || step.key === order.status;
              const isCancel = step.key === "cancelled";
              return (
                <li key={`${step.key}-${i}`} className="relative flex gap-3 pb-4 last:pb-1">
                  {i < arr.length - 1 ? (
                    <span
                      className={cn(
                        "absolute top-6 bottom-0 left-[11px] w-0.5",
                        done ? "bg-leaf/50" : "bg-black/10",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      isCancel
                        ? "bg-red-500 text-white"
                        : done
                          ? "bg-track text-black"
                          : "bg-black/[0.08] text-transparent",
                    )}
                  >
                    {isCancel ? (
                      <X className="h-3 w-3 stroke-[3]" aria-hidden />
                    ) : done ? (
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p
                      className={cn(
                        "text-[13px] font-bold",
                        isCancel ? "text-red-700" : "text-ink",
                      )}
                    >
                      {step.label}
                    </p>
                    {step.at ? (
                      <p className="mt-0.5 text-[11px] text-muted">{step.at}</p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-muted">Pending</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Support */}
        <section className="flex items-center gap-3 rounded-2xl bg-mint/80 px-4 py-3.5 ring-1 ring-leaf/20">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-forest">
            <Headphones className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink">
              Need help with this order?
            </p>
            <p className="text-[11px] text-muted">We’re here if something’s off</p>
          </div>
          <Link
            href="/profile/support"
            className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[12px] font-bold text-leaf ring-1 ring-leaf/30 transition hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Contact Support
          </Link>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-bold tabular-nums",
          accent ? "text-leaf" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
