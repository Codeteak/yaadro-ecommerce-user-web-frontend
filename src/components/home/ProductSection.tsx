"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useHomeCategory } from "@/components/home/HomeCategoryContext";
import { ProductCard } from "@/components/product/ProductCard";
import { getProductsByCategory } from "@/lib/sample-products";

/**
 * Home product listing for the category selected (centered) in the
 * rail above. Data is SAMPLE placeholder data (see sample-products.ts)
 * until the catalog API lands — labelled as such under the header.
 */
export function ProductSection() {
  const { selected } = useHomeCategory();
  const products = getProductsByCategory(selected);

  return (
    <section aria-label={`${selected} products`} className="mx-auto w-full max-w-lg px-5 pt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">{selected}</h2>
          <p className="mt-0.5 text-xs text-muted">
            Sample products — real catalog coming soon
          </p>
        </div>
        <Link
          href="/categories"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Show all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div
        key={selected}
        className="onboarding-fade-up mt-4 grid grid-cols-2 gap-4"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
