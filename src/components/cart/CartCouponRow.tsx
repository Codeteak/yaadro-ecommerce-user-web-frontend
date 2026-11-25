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
 * Coupon on cart — same soft card as the bill.
 * One apply field or one applied chip; top offers fold under; errors only inline
 * (success already toasts + shows on the bill).
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
  const errorMessage = !applied && promoMessage ? promoMessage : null;

  return (
    <section className={cn(className)} aria-label="Coupon">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base font-extrabold text-black">Coupon</h2>
        {couponPickerHref && !applied ? (
          <Link
            href={couponPickerHref}
            className="text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            View all
          </Link>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
        {applied ? (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint">
              <Image
                src="/icons/coupon.svg"
                alt=""
                width={22}
                height={22}
                className="h-5 w-5"
                unoptimized
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-black">
                {appliedCode}
              </p>
              <p className="mt-0.5 truncate text-[13px] leading-5 text-muted">
                {appliedMeta?.discountLabel?.trim() ||
                  appliedMeta?.title?.trim() ||
                  "Applied on this cart"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              aria-label="Remove promo code"
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-ink ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint">
              <Image
                src="/icons/coupon.svg"
                alt=""
                width={22}
                height={22}
                className="h-5 w-5"
                unoptimized
              />
            </span>
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
              placeholder="Enter code"
              aria-label="Discount code"
              aria-invalid={errorMessage ? true : undefined}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink placeholder:font-medium placeholder:text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => onApply(input)}
              disabled={applying || !input.trim()}
              className="h-10 shrink-0 cursor-pointer rounded-full bg-track px-4 text-sm font-extrabold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-60"
            >
              {applying ? "…" : "Apply"}
            </button>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-2 text-[13px] font-semibold text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {topOfferCount > 0 && !applied ? (
          <div className="mt-3 border-t border-forest/8 pt-3">
            <button
              type="button"
              onClick={() => setTopOffersOpen((open) => !open)}
              aria-expanded={topOffersOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <span className="text-[13px] font-bold text-ink">
                Top offers
                <span className="ml-1.5 font-semibold text-muted">
                  · {topOfferCount}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
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
                  className="mt-2.5"
                  subtotal={subtotal}
                  appliedCode={appliedCode}
                  onApply={onApply}
                  coupons={offerCoupons}
                  refined
                  embedded
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
