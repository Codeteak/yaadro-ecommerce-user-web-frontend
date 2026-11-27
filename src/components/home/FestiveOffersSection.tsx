"use client";

import Link from "next/link";
import { FestiveHeroCard } from "@/components/home/FestiveHeroCard";
import { PrefetchStorefrontRoute } from "@/components/navigation/PrefetchStorefrontRoute";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  SAMPLE_FESTIVE_SHELF,
  type FestiveShelf,
} from "@/lib/festive-offers";

/** 2-col peek inside the full image card (not a produce swipe rail). */
const PEEK_LIMIT = 4;

/**
 * Home festive section — full image card (art shown, not cropped short).
 * Products: 2-col grid inside the card. ProductCard unchanged.
 */
export function FestiveOffersSection({
  className,
  shelf = SAMPLE_FESTIVE_SHELF,
  seeAllHref = "/festive",
  priority = false,
}: {
  className?: string;
  shelf?: FestiveShelf | null;
  seeAllHref?: string;
  priority?: boolean;
}) {
  if (!shelf || shelf.products.length === 0) return null;

  const total = shelf.products.length;
  const products = shelf.products.slice(0, PEEK_LIMIT);
  const moreCount = Math.max(0, total - products.length);
  const seeAllLabel =
    total === 1
      ? "See all 1 offer"
      : moreCount > 0
        ? `See all ${total} offers`
        : "See all offers";

  return (
    <section
      aria-label={shelf.title}
      className={cn("relative w-full bg-paper px-3 py-5 sm:px-4", className)}
    >
      <PrefetchStorefrontRoute href={seeAllHref} />
      <FestiveHeroCard
        variant="section"
        title={shelf.title}
        priority={priority}
      >
        <div className="rounded-[1.35rem] bg-[#fffaf0]/92 p-3 ring-1 ring-white/50 backdrop-blur-[2px] sm:p-3.5">
          <div className="mb-2.5 flex items-baseline justify-between gap-2 px-0.5">
            <p className="text-[12px] font-semibold text-forest/75">
              {moreCount > 0
                ? `Showing ${products.length} of ${total}`
                : `${total} ${total === 1 ? "offer" : "offers"}`}
            </p>
            {moreCount > 0 ? (
              <p className="text-[12px] font-bold text-forest">
                +{moreCount} more
              </p>
            ) : null}
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {products.map((product, index) => (
              <li key={product.id} className="min-w-0">
                <ProductCard
                  product={product}
                  priority={priority && index < 2}
                />
              </li>
            ))}
          </ul>
          <Link
            href={seeAllHref}
            prefetch
            className="mt-3 flex h-10 w-full touch-manipulation items-center justify-center rounded-full bg-track text-[13px] font-bold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] transition-colors hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf active:bg-leaf-bright"
          >
            {seeAllLabel}
          </Link>
        </div>
      </FestiveHeroCard>
    </section>
  );
}
