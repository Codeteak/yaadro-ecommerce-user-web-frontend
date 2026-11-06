"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import { suggestCartProducts } from "@/lib/api/suggest-cart-products";
import { cartSuggestions } from "@/lib/cart-suggestions";
import type { SampleProduct } from "@/lib/sample-products";
import {
  CART_SUGGESTION_GAP,
  CART_SUGGESTION_SLOT,
} from "@/lib/product-card-layout";

/**
 * “Add more products” + compact suggestion rail for a filled cart.
 * Storefront loads the live catalog. Playground keeps the sample rail
 * when the basket has no category ids.
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
  const [suggestions, setSuggestions] = useState<SampleProduct[]>([]);

  useEffect(() => {
    const productIds = idsKey ? idsKey.split("\0") : [];
    const categories = categoriesKey ? categoriesKey.split("\0") : [];
    if (sampleFallback && categories.length === 0) {
      setSuggestions(cartSuggestions(productIds));
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void suggestCartProducts(categories, productIds).then(
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
  }, [idsKey, categoriesKey, sampleFallback]);

  return (
    <section className={cn("mt-6", className)} aria-label="Add more products">
      <Link
        href={shopHref}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-track px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        Add more products
      </Link>

      {suggestions.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-base font-extrabold text-ink">You may also like</h3>
          <ul
            className={cn(
              "mt-3 -mx-1 flex overflow-x-auto px-1 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              CART_SUGGESTION_GAP,
            )}
          >
            {suggestions.map((product) => (
              <li
                key={product.id}
                className={cn(CART_SUGGESTION_SLOT, "shrink-0")}
              >
                <ProductCard product={product} size="compact" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
