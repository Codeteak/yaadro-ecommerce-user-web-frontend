import { CartProvider } from "@/components/cart/CartContext";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <StorefrontChrome>{children}</StorefrontChrome>
    </CartProvider>
  );
}
