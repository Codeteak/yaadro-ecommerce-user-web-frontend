"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { cn } from "@/lib/cn";

/**
 * Storefront shell chrome. Bottom nav is hidden on /cart and /checkout
 * so action chrome can sit at the bottom without a second bar.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/cart" || pathname === "/checkout";

  return (
    <>
      <div
        className={cn(
          "min-h-dvh overscroll-y-none",
          !hideNav && "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
      <ViewCartBar />
      <WeightCustomizer />
    </>
  );
}
