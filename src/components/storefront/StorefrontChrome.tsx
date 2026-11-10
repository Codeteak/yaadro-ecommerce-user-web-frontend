"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { cn } from "@/lib/cn";
import { shouldHideStorefrontNav } from "@/lib/storefront-nav";

/**
 * Path-dependent chrome. `usePathname` suspends on dynamic routes
 * (for example /product/[id]) until the URL is known, so it stays
 * under Suspense and does not block the page prerender.
 */
function StorefrontPathChrome() {
  const pathname = usePathname();
  const hideNav = shouldHideStorefrontNav(pathname);

  return (
    <>
      {hideNav ? <span data-storefront-hide-nav hidden /> : null}
      {!hideNav && <BottomNav />}
      <ViewCartBar />
      <WeightCustomizer />
    </>
  );
}

/**
 * Storefront shell chrome. Bottom nav stays on Home, Categories,
 * Wishlist, Profile, Orders, Coupons, and product/PLP pages.
 * It hides on cart, checkout, order detail, and profile task screens
 * (edit, addresses, settings, support) so the back header owns the page.
 * Page content stays outside the pathname Suspense boundary.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-dvh overscroll-y-none pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
        "has-[[data-storefront-hide-nav]]:pb-0",
      )}
    >
      {children}
      <Suspense fallback={null}>
        <StorefrontPathChrome />
      </Suspense>
    </div>
  );
}
