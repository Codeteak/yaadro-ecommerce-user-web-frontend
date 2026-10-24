import { CartProvider } from "@/components/cart/CartContext";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      {/* Local signed-in scaffold until a real session API exists.
          Hearts save to localStorage; /wishlist shows the product grid. */}
      <WishlistProvider previewSignedIn>
        <StorefrontChrome>{children}</StorefrontChrome>
      </WishlistProvider>
    </CartProvider>
  );
}
