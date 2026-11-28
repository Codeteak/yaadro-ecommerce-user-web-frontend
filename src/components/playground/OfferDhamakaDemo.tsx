"use client";

import { OfferDhamakaCard } from "@/components/home/OfferDhamakaCard";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { offerDhamakaSeeAllLabel } from "@/lib/offer-dhamaka";

/**
 * Playground lab for Offer Dhamaka (not on live /home).
 * Buy-X-get-Y / deals needs a dedicated backend section API before ecom wire.
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
        Playground only — not wired to shop_home_sections. Sticky product
        footer; CTA = “{seeAll}” → playground See-all. Live wire waits on a
        dedicated deals / buy-X-get-Y API.
      </p>
      <WeightCustomizer />
    </div>
  );
}
