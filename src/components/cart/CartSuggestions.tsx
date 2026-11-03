"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import { cartSuggestions } from "@/lib/cart-suggestions";
import {
  CART_SUGGESTION_GAP,
  CART_SUGGESTION_SLOT,
} from "@/lib/product-card-layout";

/**
 * “Add more products” + compact suggestion rail for filled cart.
 * Opt in via CartPageContent `showCartSuggestions` (storefront /cart + playground).
 */
export function CartSuggestions({
  cartProductIds,
  shopHref = "/home",
  className,
}: {
  cartProductIds: readonly string[];
  shopHref?: string;
  className?: string;
}) {
  const suggestions = cartSuggestions(cartProductIds);

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
