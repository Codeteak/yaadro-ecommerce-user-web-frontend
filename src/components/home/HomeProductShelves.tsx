"use client";

import { useMemo } from "react";
import { HomeProductShelf } from "@/components/home/HomeProductShelf";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { useWishlistOptional } from "@/components/wishlist/WishlistContext";
import { cn } from "@/lib/cn";
import { HOME_SHELVES, productsForShelf } from "@/lib/home-shelves";
import type { SampleProduct } from "@/lib/sample-products";

export type LiveShelf = {
  id: string;
  title: string;
  subtitle?: string;
  products: SampleProduct[];
};

/**
 * Stacked vertical shelves: Featured, Most ordered, Favourites.
 * Favourites prefers live wishlist when signed in with items.
 * Live under FruitsVeggiesSection on /home (and playground demo).
 */
export function HomeProductShelves({
  className,
  shelves: liveShelves,
}: {
  className?: string;
  /** Live home-sections. Omit to keep the sample shelves. */
  shelves?: LiveShelf[];
}) {
  const t = useTypeScale();
  const wishlist = useWishlistOptional();

  const shelves = useMemo((): LiveShelf[] => {
    if (liveShelves) {
      const next = liveShelves.map((shelf) => ({ ...shelf }));
      if (wishlist?.signedIn && wishlist.products.length > 0) {
        next.push({
          id: "device-favourites",
          title: "Your favourites",
          subtitle: "Saved on this device",
          products: wishlist.products,
        });
      }
      return next;
    }
    return HOME_SHELVES.map((shelf) => {
      if (shelf.id === "favourites" && wishlist?.signedIn && wishlist.products.length > 0) {
        return {
          id: shelf.id,
          title: shelf.title,
          subtitle: "Saved on this device",
          products: wishlist.products,
        };
      }
      return {
        id: shelf.id,
        title: shelf.title,
        subtitle: shelf.subtitle,
        products: productsForShelf(shelf),
      };
    });
  }, [liveShelves, wishlist?.signedIn, wishlist?.products]);

  return (
    <div className={cn(t.homeShelvesStack, className)}>
      {shelves.map((shelf) => {
        if (shelf.products.length === 0) return null;
        return (
          <HomeProductShelf
            key={shelf.id}
            shelf={shelf}
            products={shelf.products}
          />
        );
      })}
    </div>
  );
}
