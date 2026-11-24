"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import {
  CartTopCoupons,
  topActiveCoupons,
} from "@/components/cart/CartTopCoupons";
import { cn } from "@/lib/cn";
import type { SampleCoupon } from "@/lib/sample-coupons";

type CartCouponRowProps = {
  subtotal: number;
  appliedCode?: string | null;
  appliedMeta?: SampleCoupon | null;
  promoMessage?: string | null;
  applying?: boolean;
  couponPickerHref?: string;
  /** Live shop coupons; omit → sample list in Top offers. */
  offerCoupons?: SampleCoupon[];
  onApply: (code: string) => void;
  onClear: () => void;
  className?: string;
};

/**
 * Typed code + Apply, optional View all, Top offers fold-out, applied Remove.
 */
export function CartCouponRow({
  subtotal,
  appliedCode,
  appliedMeta,
  promoMessage,
  applying = false,
  couponPickerHref,
  offerCoupons,
  onApply,
  onClear,
  className,
}: CartCouponRowProps) {
  const [input, setInput] = useState("");
  const [topOffersOpen, setTopOffersOpen] = useState(false);
  const topOfferCount = topActiveCoupons(offerCoupons).length;
  const applied = Boolean(appliedCode);

  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(47,107,47,0.14)] ring-2 ring-leaf",
        className,
      )}
    >
      {topOfferCount > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setTopOffersOpen((open) => !open)}
            aria-expanded={topOffersOpen}
            className="flex w-full cursor-pointer items-center gap-2 rounded-xl bg-paper/80 px-2.5 py-2 ring-1 ring-forest/10 transition hover:bg-mint/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint">
              <Image
                src="/icons/coupon.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5"
                unoptimized
              />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-black">Top offers</span>
              <span className="block text-[12px] font-medium text-muted">
                {topOfferCount} available
                {appliedCode ? ` · ${appliedCode}` : ""}
              </span>
            </span>
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-extrabold text-forest">
              {topOfferCount}
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-forest transition-transform duration-200",
                topOffersOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              topOffersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <CartTopCoupons
                className="mt-2.5 px-0.5 pb-1"
                subtotal={subtotal}
                appliedCode={appliedCode}
                onApply={onApply}
                coupons={offerCoupons}
                refined
                embedded
              />
            </div>
          </div>
          <div className="my-2.5 border-t border-forest/10" />
        </>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-2.5 py-2 ring-1 ring-forest/10">
        {topOfferCount === 0 ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint">
            <Image
              src="/icons/coupon.svg"
              alt=""
              width={20}
              height={20}
              className="h-5 w-5"
              unoptimized
            />
          </span>
        ) : null}
        {applied ? (
          <>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {appliedCode}
            </p>
            <button
              type="button"
              onClick={onClear}
              aria-label="Remove promo code"
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-black/[0.06] px-3 text-xs font-semibold text-muted transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onApply(input);
                }
              }}
              placeholder="Enter discount code"
              aria-label="Discount code"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink placeholder:text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => onApply(input)}
              disabled={applying || !input.trim()}
              className="h-9 shrink-0 cursor-pointer rounded-xl bg-track px-4 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {applying ? "…" : "Apply"}
            </button>
          </>
        )}
      </div>

      {couponPickerHref && !applied ? (
        <Link
          href={couponPickerHref}
          className="mt-2 block text-center text-[12px] font-semibold text-leaf underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          View all coupons
        </Link>
      ) : null}

      {appliedMeta ? (
        <p className="mt-2 text-center text-[12px] font-medium text-forest" role="status">
          {appliedMeta.minOrderLabel}
          {appliedMeta.subtitle ? ` · ${appliedMeta.subtitle}` : null}
        </p>
      ) : null}
      {promoMessage ? (
        <p
          className={cn(
            "mt-2 text-center text-[13px] font-medium",
            applied ? "text-forest" : "text-red-600",
          )}
          role="status"
        >
          {promoMessage}
        </p>
      ) : null}
    </div>
  );
}
