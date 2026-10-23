import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/CartContext";
import { PlaygroundShell } from "@/components/playground/PlaygroundShell";

export const metadata: Metadata = {
  title: "Playground",
  robots: { index: false, follow: false },
};

/**
 * In-app component lab — development only (middleware 404s in production).
 * CartProvider is included so ProductCard / ViewCartBar / WeightCustomizer
 * demos work without the storefront layout.
 */
export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <PlaygroundShell>{children}</PlaygroundShell>
    </CartProvider>
  );
}
