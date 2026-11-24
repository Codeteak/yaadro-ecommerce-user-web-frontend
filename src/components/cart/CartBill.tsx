"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatRupees } from "@/lib/cart-checkout-rules";
import type { CartBillModel } from "@/lib/cart-bill";

type CartBillProps = {
  bill: CartBillModel;
  className?: string;
};

/**
 * Clear bill: MRP → discounts → To pay. "You saved" is a strip, not a maths row.
 * No delivery row (fee is confirmed at place-order).
 */
export function CartBill({ bill, className }: CartBillProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
        <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
          <span className="text-muted">
            Items total
            {bill.itemCount > 0 ? ` · ${bill.itemCount}` : ""}
          </span>
          <span className="font-bold text-black tabular-nums">
            {formatRupees(bill.mrpTotal)}
          </span>
        </div>
        {bill.productDiscount > 0 ? (
          <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
            <span className="text-muted">Product discount</span>
            <span className="font-bold text-leaf tabular-nums">
              −{formatRupees(bill.productDiscount)}
            </span>
          </div>
        ) : null}
        {bill.offers.map((offer) => {
          const row = (
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="min-w-0 truncate text-muted">{offer.label}</span>
              <span className="shrink-0 font-bold text-leaf tabular-nums">
                −{formatRupees(offer.discountRupees)}
              </span>
            </div>
          );
          if (!offer.categoryId) {
            return <div key={`${offer.label}-${offer.discountRupees}`}>{row}</div>;
          }
          return (
            <Link
              key={`${offer.label}-${offer.categoryId}`}
              href={`/categories?cat=${offer.categoryId}`}
              className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              {row}
            </Link>
          );
        })}
        {bill.coupon ? (
          <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
            <span className="text-muted">Coupon ({bill.coupon.code})</span>
            <span className="font-bold text-leaf tabular-nums">
              −{formatRupees(bill.coupon.discountRupees)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="font-bold text-black">To pay</span>
          <span className="font-extrabold text-leaf tabular-nums">
            {formatRupees(bill.toPay)}
          </span>
        </div>
      </div>

      {bill.saved > 0 ? (
        <p
          className="rounded-xl bg-mint/70 px-3.5 py-2.5 text-center text-[13px] font-bold text-forest ring-1 ring-leaf/20"
          role="status"
        >
          You saved {formatRupees(bill.saved)} on this order
        </p>
      ) : null}

      {bill.minimumMessage ? (
        <p
          role="status"
          className="rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-3 text-[13px] leading-5 font-bold text-amber-950"
        >
          {bill.minimumMessage}
        </p>
      ) : null}
    </div>
  );
}
