import { BottomNav } from "@/components/navigation/BottomNav";
import { CartProvider } from "@/components/cart/CartContext";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-dvh overscroll-y-none pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
      <ViewCartBar />
      <WeightCustomizer />
    </CartProvider>
  );
}
