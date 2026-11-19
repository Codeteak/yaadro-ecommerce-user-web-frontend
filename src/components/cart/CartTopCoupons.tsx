"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  SAMPLE_COUPONS,
  type SampleCoupon,
} from "@/lib/sample-coupons";

export function topActiveCoupons(
  coupons: SampleCoupon[] = SAMPLE_COUPONS,
  limit = 2,
): SampleCoupon[] {
  return coupons.filter((c) => c.status === "active").slice(0, limit);
}

type CartTopCouponsProps = {
  /** Basket subtotal used for min-order checks (same as promo apply). */
  subtotal: number;
  appliedCode?: string | null;
  onApply: (code: string) => void;
  className?: string;
  /**
   * Playground-only polish: honest Apply state, clearer hierarchy, stronger
   * applied look. Live cart keeps the simpler row until confirmed.
   */
  refined?: boolean;
  /** Hide the “Top offers” heading when nested under the coupon apply shell. */
  embedded?: boolean;
  /** Live: shop coupons. Omit → SAMPLE_COUPONS (playground). */
  coupons?: SampleCoupon[];
};

/**
 * First 2 active coupons with min-order copy on cart.
 * Live passes shop coupons; playground omits and uses samples.
 */
export function CartTopCoupons({
  subtotal,
  appliedCode,
  onApply,
  className,
  refined = false,
  embedded = false,
  coupons: couponsProp,
}: CartTopCouponsProps) {
  const coupons = topActiveCoupons(couponsProp);
  if (coupons.length === 0) return null;

  return (
    <div className={cn(embedded ? "space-y-2" : "space-y-2", className)}>
      {!embedded ? (
        <p className="px-0.5 text-[12px] font-bold tracking-wide text-forest/80 uppercase">
          Top offers
        </p>
      ) : null}
      <ul className="space-y-2" aria-label="Top coupons">
        {coupons.map((coupon) => {
          const short = Math.max(0, coupon.minOrder - subtotal);
          const meetsMin = short === 0;
          const isApplied =
            Boolean(appliedCode) &&
            appliedCode!.toUpperCase() === coupon.code.toUpperCase();
          const locked = refined && !meetsMin && !isApplied;
          const canApply = !isApplied && (!refined || meetsMin);

          if (!refined) {
            return (
              <li key={coupon.id}>
                <div
                  className={cn(
                    "flex items-stretch gap-3 rounded-2xl bg-white px-3 py-3 ring-1",
                    isApplied
                      ? "ring-leaf shadow-[0_6px_16px_rgba(47,107,47,0.14)]"
                      : "ring-black/[0.06]",
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center self-center rounded-xl bg-mint">
                    <Image
                      src="/icons/coupon.svg"
                      alt=""
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px]"
                      unoptimized
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-black">
                      {coupon.discountLabel}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold text-muted">
                      {coupon.code}
                      <span className="text-muted/70"> · </span>
                      {coupon.minOrderLabel}
                    </p>
                    {!meetsMin ? (
                      <p
                        className="mt-1 text-[12px] font-medium text-amber-800"
                        role="status"
                      >
                        Add ₹{short} more to use this
                      </p>
                    ) : isApplied ? (
                      <p
                        className="mt-1 text-[12px] font-medium text-forest"
                        role="status"
                      >
                        Applied on this cart
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={isApplied}
                    onClick={() => onApply(coupon.code)}
                    className={cn(
                      "shrink-0 self-center rounded-xl px-3.5 py-2 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                      isApplied
                        ? "cursor-default bg-mint text-forest"
                        : "cursor-pointer bg-track text-black hover:bg-leaf-bright motion-safe:active:scale-[0.97]",
                    )}
                  >
                    {isApplied ? "On" : "Apply"}
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={coupon.id}>
              <div
                className={cn(
                  "relative flex items-stretch gap-3 overflow-hidden rounded-2xl bg-white px-3 py-3.5 ring-1 transition",
                  isApplied
                    ? "bg-mint/40 ring-leaf shadow-[0_6px_16px_rgba(47,107,47,0.14)]"
                    : locked
                      ? "ring-black/[0.05] opacity-[0.92]"
                      : "ring-black/[0.06]",
                )}
              >
                <span
                  className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-leaf/70"
                  aria-hidden
                />
                <span className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-xl bg-mint">
                  <Image
                    src="/icons/coupon.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    unoptimized
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-extrabold text-black">
                    {coupon.discountLabel}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-ink">
                      {coupon.code}
                    </span>
                    <span className="text-[11px] font-medium text-muted">
                      {coupon.minOrderLabel}
                    </span>
                  </div>
                  {!meetsMin ? (
                    <p
                      className="mt-1.5 text-[12px] font-semibold text-amber-800"
                      role="status"
                    >
                      Add ₹{short.toLocaleString("en-IN")} more to unlock
                    </p>
                  ) : isApplied ? (
                    <p
                      className="mt-1.5 text-[12px] font-semibold text-forest"
                      role="status"
                    >
                      Applied on this cart
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[12px] font-medium text-forest">
                      Ready to apply
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={() => onApply(coupon.code)}
                  className={cn(
                    "shrink-0 self-center rounded-full px-4 py-2.5 text-[12px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                    isApplied
                      ? "cursor-default bg-forest text-white"
                      : locked
                        ? "cursor-not-allowed bg-black/[0.06] text-muted"
                        : "cursor-pointer bg-track text-black hover:bg-leaf-bright motion-safe:active:scale-[0.97]",
                  )}
                >
                  {isApplied ? "Applied" : "Apply"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
