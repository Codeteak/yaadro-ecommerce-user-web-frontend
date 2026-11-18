"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, Home } from "lucide-react";
import { cn } from "@/lib/cn";

export type OrderPlacedSummary = {
  billNo: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillment?: "Delivery" | "Pickup";
  statusLabel?: string;
};

type OrderPlacedContentProps = {
  summary: OrderPlacedSummary;
  /** Order history list. */
  ordersHref: string;
  homeHref: string;
  className?: string;
  /** Extra control under CTAs (e.g. playground). */
  footer?: ReactNode;
  /** Hide “preview only” copy on a real placed order. */
  live?: boolean;
};

/**
 * Order placed confirmation: mascot + bill summary + Order history / Home.
 */
export function OrderPlacedContent({
  summary,
  ordersHref,
  homeHref,
  className,
  footer,
  live = false,
}: OrderPlacedContentProps) {
  const status = summary.statusLabel ?? "Confirmed";
  const fulfillment = summary.fulfillment ?? "Delivery";

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center px-5 pt-16 pb-10 sm:pt-20",
        className,
      )}
    >
      <Image
        src="/checkout/order-confirmed-mascot.png"
        alt=""
        width={813}
        height={665}
        className="h-auto w-44 max-w-full sm:w-52"
        priority
      />

      <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-black">
        Order placed!
      </h1>
      <p className="mt-2 max-w-72 text-center text-[14px] leading-5 text-muted">
        Thank you for your order. We&apos;re packing your groceries with care.
      </p>

      <div className="mt-6 w-full rounded-[1.35rem] bg-white p-4 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-forest/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide text-muted uppercase">
              Bill no
            </p>
            <p className="mt-0.5 truncate text-[16px] font-extrabold text-black">
              {summary.billNo}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="inline-flex items-center rounded-full bg-mint px-2.5 py-1 text-[11px] font-extrabold text-forest">
              {status}
            </span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-bold text-muted">
              {fulfillment}
            </span>
          </div>
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-forest/8 pt-4">
          <SummaryRow
            label="Items"
            value={`${summary.itemCount} ${summary.itemCount === 1 ? "item" : "items"}`}
          />
          <SummaryRow label="Subtotal" value={`₹${summary.subtotal}`} />
          <SummaryRow
            label="Delivery fee"
            value={`₹${summary.deliveryFee}`}
          />
        </dl>

        <div className="mt-3 flex items-center justify-between border-t border-forest/8 pt-3">
          <span className="text-[14px] font-extrabold text-black">Total</span>
          <span className="text-[16px] font-extrabold tabular-nums text-forest">
            ₹{summary.total}
          </span>
        </div>
      </div>

      <div className="mt-5 flex w-full flex-col gap-2.5">
        <Link
          href={ordersHref}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-track text-[15px] font-extrabold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
          Order history
        </Link>
        <Link
          href={homeHref}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-extrabold text-black ring-1 ring-forest/20 transition hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <Home className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </div>

      {!live ? (
        <p className="mt-5 text-center text-[12px] font-medium text-muted" role="status">
          Preview only — no order was sent to the store yet.
        </p>
      ) : (
        <p className="mt-5 max-w-72 text-center text-[12px] leading-5 text-muted">
          Pay cash when your order arrives. Track progress anytime from Order
          history.
        </p>
      )}

      {footer}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className="font-bold text-black">{value}</dd>
    </div>
  );
}

/** Sample summary for playground. */
export const SAMPLE_ORDER_PLACED: OrderPlacedSummary = {
  billNo: "#YAD-32122",
  itemCount: 2,
  subtotal: 11,
  deliveryFee: 25,
  total: 36,
  fulfillment: "Delivery",
  statusLabel: "Confirmed",
};
