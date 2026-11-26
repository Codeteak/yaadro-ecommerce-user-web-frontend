"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BodyScrollUnlockOnNavigate } from "@/components/navigation/BodyScrollUnlockOnNavigate";
import { BottomNav } from "@/components/navigation/BottomNav";
import { NavScrollProvider } from "@/components/navigation/NavScrollContext";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { cn } from "@/lib/cn";
import { shouldHideStorefrontNav } from "@/lib/storefront-nav";

/** Match BottomNav / route-clearance timing when path-hide removes the pill. */
const NAV_MOTION =
  "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

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
      {!hideNav && <ViewCartBar />}
      <WeightCustomizer />
    </>
  );
}

/**
 * Storefront shell chrome. Bottom nav + ViewCartBar stay on Home,
 * Categories, Wishlist, Profile, Orders list, Coupons, and product/PLP.
 *
 * Scroll-hide only transforms the pill — `--storefront-nav-clearance`
 * stays at 5.5rem so document height does not change at the bottom
 * (avoids clamp/vibration). Path-hidden routes still force clearance to 0.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  return (
    <NavScrollProvider>
      <div
        className={cn(
          "min-h-dvh transition-[padding-bottom]",
          NAV_MOTION,
          "pb-[calc(var(--storefront-nav-clearance,5.5rem)+env(safe-area-inset-bottom,0px))]",
          "has-[[data-storefront-hide-nav]]:[--storefront-nav-clearance:0px]",
          "has-[[data-storefront-fill]]:overflow-hidden has-[[data-storefront-fill]]:overscroll-y-none",
        )}
      >
        {children}
        <Suspense fallback={null}>
          <BodyScrollUnlockOnNavigate />
          <StorefrontPathChrome />
        </Suspense>
      </div>
    </NavScrollProvider>
  );
}
