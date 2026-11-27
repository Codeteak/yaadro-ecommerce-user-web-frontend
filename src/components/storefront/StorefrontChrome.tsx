"use client";

import { Suspense, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BodyScrollUnlockOnNavigate } from "@/components/navigation/BodyScrollUnlockOnNavigate";
import { BottomNav } from "@/components/navigation/BottomNav";
import {
  NavScrollProvider,
  useNavScroll,
} from "@/components/navigation/NavScrollContext";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { cn } from "@/lib/cn";
import {
  isStorefrontFillPath,
  shouldHideStorefrontNav,
} from "@/lib/storefront-nav";

/** Match BottomNav slide timing so padding and pill move together. */
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
  const fillRoute = isStorefrontFillPath(pathname);

  return (
    <>
      {hideNav ? <span data-storefront-hide-nav hidden /> : null}
      {/* URL-driven — not page DOM — so VT exit of categories cannot stick overflow. */}
      {fillRoute ? <span data-storefront-fill-route hidden /> : null}
      {!hideNav && <BottomNav />}
      {!hideNav && <ViewCartBar />}
      <WeightCustomizer />
    </>
  );
}

/**
 * Clearance tracks scroll-hide with the floating BottomNav island.
 * Fill routes lock shell overflow via `data-storefront-fill-route` (pathname),
 * not `:has([data-storefront-fill])`, so back-to-home stays document-scrollable.
 * Fill routes keep clearance at 5.5rem while the pill hides (avoids maxY jump).
 */
function StorefrontChromeLayout({ children }: { children: ReactNode }) {
  const { navHidden } = useNavScroll();
  const pathname = usePathname();
  const fillRoute = isStorefrontFillPath(pathname);
  const hideNav = shouldHideStorefrontNav(pathname);

  const style = {
    ["--storefront-nav-clearance" as string]:
      hideNav || (navHidden && !fillRoute) ? "0px" : "5.5rem",
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "min-h-dvh transition-[padding-bottom]",
        NAV_MOTION,
        "pb-[calc(var(--storefront-nav-clearance,5.5rem)+env(safe-area-inset-bottom,0px))]",
        // Fill + path-hidden routes: no shell footer band (pages own safe-area).
        "has-[[data-storefront-fill-route]]:pb-0",
        "has-[[data-storefront-hide-nav]]:pb-0",
        "has-[[data-storefront-fill-route]]:overflow-hidden has-[[data-storefront-fill-route]]:overscroll-y-none",
      )}
    >
      {children}
      <Suspense fallback={null}>
        <BodyScrollUnlockOnNavigate />
        <StorefrontPathChrome />
      </Suspense>
    </div>
  );
}

/**
 * Storefront shell chrome. BottomNav is a fixed floating island on Home,
 * Categories, Wishlist, Profile, Orders list, Coupons, and product/PLP.
 * Scroll-hide collapses clearance; fill routes never leave a blank paper band.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  return (
    <NavScrollProvider>
      <Suspense
        fallback={
          <div className="min-h-dvh bg-paper pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
            {children}
          </div>
        }
      >
        <StorefrontChromeLayout>{children}</StorefrontChromeLayout>
      </Suspense>
    </NavScrollProvider>
  );
}
