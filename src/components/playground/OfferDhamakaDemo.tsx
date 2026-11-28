"use client";

import { OfferDhamakaCard } from "@/components/home/OfferDhamakaCard";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { offerDhamakaSeeAllLabel } from "@/lib/offer-dhamaka";

/**
 * Playground lab for the Offer Dhamaka home card (also wired on live /home).
 * Sticky product footer + See all caps at 10+.
 */
export function OfferDhamakaDemo() {
  const seeAll = offerDhamakaSeeAllLabel(12);

  return (
    <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
      <OfferDhamakaCard
        priority
        href="/playground/offer-dhamaka-page"
      />
      <p className="px-5 pb-6 text-center text-[12px] leading-5 text-muted">
        Live /home when admin title matches. Sticky product footer above the
        bottom nav. CTA = “{seeAll}” → /deals (this lab → playground page).
      </p>
      <WeightCustomizer />
    </div>
  );
}
