"use client";

import Image from "next/image";
import Link from "next/link";
import { PrefetchStorefrontRoute } from "@/components/navigation/PrefetchStorefrontRoute";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  OFFER_DHAMAKA_ART_W,
  OFFER_DHAMAKA_BG,
  OFFER_DHAMAKA_CARD_ART_H,
  OFFER_DHAMAKA_DEFAULT_HREF,
  offerDhamakaSeeAllLabel,
  SAMPLE_OFFER_DHAMAKA,
  type OfferDhamakaShelf,
} from "@/lib/offer-dhamaka";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";

const RAIL_PEEK = 8;

type OfferDhamakaCardProps = {
  className?: string;
  shelf?: OfferDhamakaShelf | null;
  /** Defaults to playground See-all page. */
  href?: string;
  priority?: boolean;
};

/**
 * Offer Dhamaka promo — playground only until buy-X-get-Y / deals API exists.
 *
 * One purple card: creative (Special Offers / Price Drop stay in the art —
 * no HTML header), then a product band that overlaps the art and sticks as a
 * footer above the bottom nav while the section is in view.
 */
export function OfferDhamakaCard({
  className,
  shelf = SAMPLE_OFFER_DHAMAKA,
  href = OFFER_DHAMAKA_DEFAULT_HREF,
  priority = false,
}: OfferDhamakaCardProps) {
  if (!shelf || shelf.products.length === 0) return null;

  const total = shelf.products.length;
  const products = shelf.products.slice(0, RAIL_PEEK);
  const seeAllLabel = offerDhamakaSeeAllLabel(total);

  return (
    <section
      aria-label={`${shelf.title} — price drop`}
      className={cn("relative w-full bg-paper px-3 py-5 sm:px-4", className)}
    >
      <PrefetchStorefrontRoute href={href} />
      {/* No overflow-hidden on the outer shell — sticky footer needs a non-clipping ancestor. */}
      <div className="relative mx-auto w-full max-w-lg rounded-[1.75rem] bg-[#7b2fd0] shadow-[0_16px_40px_rgba(80,40,100,0.32)] ring-1 ring-black/[0.08]">
        <div
          className="relative w-full overflow-hidden rounded-t-[1.75rem]"
          style={{
            aspectRatio: `${OFFER_DHAMAKA_ART_W} / ${OFFER_DHAMAKA_CARD_ART_H}`,
          }}
        >
          <Image
            src={OFFER_DHAMAKA_BG}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover object-top"
          />
        </div>

        {/* Sticky footer: product rail + CTA stay above BottomNav while art scrolls. */}
        <div
          className={cn(
            "sticky z-10 -mt-28 space-y-3 rounded-b-[1.75rem]",
            "bg-gradient-to-b from-transparent via-[#7b2fd0]/95 to-[#6a24b8]",
            "px-3.5 pt-2 pb-5 sm:-mt-32 sm:px-4 sm:pb-6",
            "bottom-[calc(var(--storefront-nav-clearance,5.5rem)+env(safe-area-inset-bottom,0px))]",
          )}
        >
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={cn(
                  PRODUCT_CAROUSEL_SLOT,
                  "shrink-0 rounded-[1.25rem] shadow-[0_12px_28px_rgba(0,0,0,0.28)]",
                )}
              >
                <ProductCard
                  product={product}
                  priority={priority && index < 2}
                />
              </div>
            ))}
            <div className="w-2 shrink-0" aria-hidden />
          </div>

          <Link
            href={href}
            prefetch
            className="flex h-11 w-full touch-manipulation items-center justify-center rounded-full bg-track text-[13px] font-bold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] transition-colors hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf active:bg-leaf-bright"
          >
            {seeAllLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
