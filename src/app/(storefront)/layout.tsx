import { CartProvider } from "@/components/cart/CartContext";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";
import { TypeScaleProvider } from "@/components/ui/TypeScaleContext";
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
        <TypeScaleProvider scale="spec">
          <StorefrontChrome>{children}</StorefrontChrome>
        </TypeScaleProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
