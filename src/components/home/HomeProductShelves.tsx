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
  /** Admin sort_order — omit for playground sample shelves. */
  sortOrder?: number;
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

  const shelves = useMemo((): LiveShelf[] => {
    if (liveShelves) return liveShelves.map((shelf) => ({ ...shelf }));
    return HOME_SHELVES.filter((shelf) => shelf.id !== "favourites").map((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      subtitle: shelf.subtitle,
      products: productsForShelf(shelf),
    }));
  }, [liveShelves]);

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
      <HomeFavouritesShelf live={Boolean(liveShelves)} />
    </div>
  );
}

/** Subscribes to the wishlist on its own so the other shelves stay still. */
export function HomeFavouritesShelf({
  live = true,
  className,
}: {
  live?: boolean;
  className?: string;
}) {
  const shelf = <FavouritesShelfInner live={live} />;
  if (!className) return shelf;
  return <div className={className}>{shelf}</div>;
}

function FavouritesShelfInner({ live }: { live: boolean }) {
  const wishlist = useWishlistOptional();
  if (wishlist?.signedIn && wishlist.products.length > 0) {
    return (
      <HomeProductShelf
        shelf={{
          id: "device-favourites",
          title: "Your favourites",
          subtitle: "Saved on this device",
        }}
        products={wishlist.products}
      />
    );
  }
  if (live) return null;
  const sample = HOME_SHELVES.find((shelf) => shelf.id === "favourites");
  if (!sample) return null;
  return <HomeProductShelf shelf={sample} />;
}
