"use client";

import Link from "next/link";
import { FestiveHeroCard } from "@/components/home/FestiveHeroCard";
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

  const products = shelf.products.slice(0, PEEK_LIMIT);
  const moreCount = Math.max(0, shelf.products.length - products.length);

  return (
    <section
      aria-label={shelf.title}
      className={cn("relative w-full bg-paper px-3 py-5 sm:px-4", className)}
    >
      <FestiveHeroCard
        variant="section"
        title={shelf.title}
        priority={priority}
      >
        <div className="rounded-[1.35rem] bg-[#fffaf0]/92 p-3 ring-1 ring-white/50 backdrop-blur-[2px] sm:p-3.5">
          <div className="mb-2.5 flex items-baseline justify-end gap-2 px-0.5">
            <p className="text-[12px] font-semibold text-forest/65">
              {shelf.products.length}{" "}
              {shelf.products.length === 1 ? "offer" : "offers"}
              {moreCount > 0 ? ` · +${moreCount}` : null}
            </p>
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
            className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            See all offers
          </Link>
        </div>
      </FestiveHeroCard>
    </section>
  );
}
