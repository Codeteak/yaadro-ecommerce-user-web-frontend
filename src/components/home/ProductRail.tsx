"use client";

import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";
import type { SampleProduct } from "@/lib/sample-products";

/**
 * Horizontal product row — same px-5 / scroll-px-5 gutter as CategoryRail so
 * snap-start never pins the first card to the screen edge.
 */
export const PRODUCT_RAIL_SCROLL =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 scroll-px-5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type ProductRailProps = {
  products: SampleProduct[];
  label: string;
  className?: string;
  /** Eager-load the first N photos (home LCP). */
  priorityCount?: number;
};

/** One horizontal scrolling product row for home. */
export function ProductRail({
  products,
  label,
  className,
  priorityCount = 0,
}: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <div
      role="list"
      aria-label={label}
      className={cn(PRODUCT_RAIL_SCROLL, className)}
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          role="listitem"
          className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0 snap-start")}
        >
          <ProductCard
            product={product}
            priority={index < priorityCount}
          />
        </div>
      ))}
    </div>
  );
}
