"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import { suggestCartProducts } from "@/lib/api/suggest-cart-products";
import { cartSuggestions } from "@/lib/cart-suggestions";
import type { SampleProduct } from "@/lib/sample-products";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";

/**
 * “Add more products” + suggestion rail for a filled cart.
 * Keeps the rail steady when an item is added (filters locally; refetches
 * only when category mix changes).
 */
export function CartSuggestions({
  cartProductIds,
  categoryIds = [],
  sampleFallback = false,
  shopHref = "/home",
  className,
}: {
  cartProductIds: readonly string[];
  categoryIds?: readonly string[];
  sampleFallback?: boolean;
  shopHref?: string;
  className?: string;
}) {
  const idsKey = cartProductIds.join("\0");
  const categoriesKey = categoryIds.join("\0");
  const exclude = useMemo(
    () => new Set(idsKey ? idsKey.split("\0") : []),
    [idsKey],
  );
  const [suggestions, setSuggestions] = useState<SampleProduct[]>([]);

  // Refetch when aisle mix changes (not on every add).
  useEffect(() => {
    const categories = categoriesKey ? categoriesKey.split("\0") : [];
    const excludeIds = idsKey ? idsKey.split("\0") : [];
    let cancelled = false;

    if (sampleFallback && categories.length === 0) {
      const timer = window.setTimeout(() => {
        if (!cancelled) {
          setSuggestions(
            cartSuggestions(excludeIds).filter(
              (product) => !excludeIds.includes(product.id),
            ),
          );
        }
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    startTransition(() => {
      void suggestCartProducts(categories, excludeIds).then(
        (products) => {
          if (!cancelled) setSuggestions(products);
        },
        () => {
          if (!cancelled) setSuggestions([]);
        },
      );
    });
    return () => {
      cancelled = true;
    };
    // Intentionally omit idsKey — adds filter locally without refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categories only
  }, [categoriesKey, sampleFallback]);

  const visible = suggestions.filter((product) => !exclude.has(product.id));

  return (
    <section className={cn("mt-6", className)} aria-label="Add more products">
      <Link
        href={shopHref}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-track px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        Add more products
      </Link>

      {visible.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-base font-extrabold text-ink">You may also like</h3>
          <ul className="mt-3 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visible.map((product) => (
              <li
                key={product.id}
                className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0 snap-start")}
              >
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
