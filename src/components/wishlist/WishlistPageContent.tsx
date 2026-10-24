"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "@/components/wishlist/WishlistContext";

type WishlistPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame.
   */
  chromePosition?: "page" | "inline";
  backHref?: string;
};

/**
 * Wishlist list + empty state. Hearts on cards remove items when signed in.
 * Guests see a sign-in empty state (add-from-catalog requires login).
 */
export function WishlistPageContent({
  chromePosition = "page",
  backHref,
}: WishlistPageContentProps) {
  const inline = chromePosition === "inline";
  const { signedIn, products } = useWishlist();
  const href = backHref ?? (inline ? "/playground" : "/home");

  const emptyTitle = signedIn
    ? "Your wishlist is empty"
    : "Sign in to save favourites";
  const emptyCopy = signedIn
    ? "Tap the heart on a product to save it here for later."
    : "Create a wishlist by signing in, then tap the heart on any product.";
  const emptyCtaHref = signedIn ? "/home" : "/login";
  const emptyCtaLabel = signedIn ? "Shop now" : "Sign in";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref={href} title="Wishlist" />

      <PullToRefresh className="flex flex-1 flex-col">
        {!signedIn || products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Image
              src="/wishlist/empty-wishlist.png"
              alt=""
              width={1310}
              height={1200}
              className="h-auto w-52 max-w-full"
              priority={!inline}
            />
            <h2 className="mt-5 text-xl font-extrabold text-ink">{emptyTitle}</h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              {emptyCopy}
            </p>
            <Link
              href={emptyCtaHref}
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              {emptyCtaLabel}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-2 pb-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </PullToRefresh>
    </main>
  );
}
