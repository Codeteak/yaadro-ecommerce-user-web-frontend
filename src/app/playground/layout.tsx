import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/CartContext";
import { PlaygroundShell } from "@/components/playground/PlaygroundShell";
import { TypeScaleProvider } from "@/components/ui/TypeScaleContext";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";

export const metadata: Metadata = {
  title: "Playground",
  robots: { index: false, follow: false },
};

/**
 * In-app component lab — development only (middleware 404s in production).
 * Cart + Wishlist providers so product / cart / wishlist demos work.
 * TypeScale `spec` matches storefront heading sizes.
 * Default wishlist is guest (heart → /login) for the guest-heart demo;
 * list / empty demos nest signed-in providers. Storefront uses signed-in.
 */
export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <WishlistProvider>
        <TypeScaleProvider scale="spec">
          <PlaygroundShell>{children}</PlaygroundShell>
        </TypeScaleProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
