import { CustomerSession } from "@/components/auth/CustomerSession";
import { CartProvider } from "@/components/cart/CartContext";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";
import { TypeScaleProvider } from "@/components/ui/TypeScaleContext";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <CustomerSession>
        <TypeScaleProvider scale="spec">
          <StorefrontChrome>{children}</StorefrontChrome>
        </TypeScaleProvider>
      </CustomerSession>
    </CartProvider>
  );
}
