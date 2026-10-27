"use client";

import { useMemo } from "react";
import { HomeProductShelf } from "@/components/home/HomeProductShelf";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { useWishlistOptional } from "@/components/wishlist/WishlistContext";
import { cn } from "@/lib/cn";
import {
  HOME_SHELVES,
  productsForShelf,
  type HomeShelfDef,
} from "@/lib/home-shelves";

/**
 * Stacked vertical shelves: Featured, Most ordered, Favourites.
 * Favourites prefers live wishlist when signed in with items.
 * Live under FruitsVeggiesSection on /home (and playground demo).
 */
export function HomeProductShelves({ className }: { className?: string }) {
  const t = useTypeScale();
  const wishlist = useWishlistOptional();

  const shelves = useMemo((): HomeShelfDef[] => {
    return HOME_SHELVES.map((shelf) => {
      if (shelf.id !== "favourites") return shelf;
      if (wishlist?.signedIn && wishlist.products.length > 0) {
        return {
          ...shelf,
          subtitle: "Saved on this device",
          productIds: wishlist.products.map((p) => p.id),
        };
      }
      return shelf;
    });
  }, [wishlist?.signedIn, wishlist?.products]);

  return (
    <div className={cn(t.homeShelvesStack, className)}>
      {shelves.map((shelf) => {
        const products = productsForShelf(shelf);
        if (products.length === 0) return null;
        return <HomeProductShelf key={shelf.id} shelf={shelf} />;
      })}
    </div>
  );
}
