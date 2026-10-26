"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useHomeCategory } from "@/components/home/HomeCategoryContext";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import { catalogSlugForHomeCategory } from "@/lib/catalog-taxonomy";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";
import {
  getProductsByCategory,
  type SampleProduct,
} from "@/lib/sample-products";

const HOME_PRODUCT_LIMIT = 10;

/** Horizontal rail — py so ProductCard shadows aren’t clipped by overflow. */
const ROW_SCROLL =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Home product listing for the category selected (centered) in the
 * rail above. Caps at 10 cards across two independently scrollable
 * horizontal rows (~172px compact slots) above FruitsVeggiesSection.
 * Sample data until the catalog API lands.
 */
export function ProductSection() {
  const { selected } = useHomeCategory();
  const products = getProductsByCategory(selected).slice(0, HOME_PRODUCT_LIMIT);
  const mid = Math.ceil(products.length / 2);
  const rowTop = products.slice(0, mid);
  const rowBottom = products.slice(mid);

  return (
    <section
      aria-label={`${selected} products`}
      className="mx-auto w-full max-w-lg px-5 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">{selected}</h2>
          <p className="mt-0.5 text-xs text-muted">
            Sample products — real catalog coming soon
          </p>
        </div>
        <Link
          href={`/categories/${catalogSlugForHomeCategory(selected)}`}
          transitionTypes={["nav-forward"]}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Show all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div key={selected} className="onboarding-fade-up mt-3 flex flex-col gap-1">
        <ProductScrollRow
          products={rowTop}
          label={`${selected} row 1`}
        />
        {rowBottom.length > 0 ? (
          <ProductScrollRow
            products={rowBottom}
            label={`${selected} row 2`}
          />
        ) : null}
      </div>
    </section>
  );
}

function ProductScrollRow({
  products,
  label,
  className,
}: {
  products: SampleProduct[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="list"
      aria-label={label}
      className={cn(ROW_SCROLL, className)}
    >
      {products.map((product) => (
        <div
          key={product.id}
          role="listitem"
          className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0 snap-start")}
        >
          <ProductCard product={product} />
        </div>
      ))}
      <div className="w-1 shrink-0" aria-hidden />
    </div>
  );
}
