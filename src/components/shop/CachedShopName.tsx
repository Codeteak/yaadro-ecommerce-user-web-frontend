"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { loadShopPageData } from "@/lib/api/page-data";
import { readPageCache, rememberPage, subscribePageCache } from "@/lib/page-cache";
import type { ShopSeo } from "@/lib/shop-seo";

const SHOP_KEY = "shop";

/**
 * Shop name for profile and orders.
 * The page paints immediately. The shop is requested once, then reused.
 */
export function CachedShopName({ children }: { children: ReactNode }) {
  const shop = useSyncExternalStore(
    subscribePageCache,
    () => readPageCache<ShopSeo>(SHOP_KEY),
    () => null,
  );

  useEffect(() => {
    if (readPageCache<ShopSeo>(SHOP_KEY)) return;
    let cancelled = false;
    loadShopPageData()
      .then((value) => {
        if (!cancelled) rememberPage(SHOP_KEY, value, true);
      })
      .catch(() => {
        // Keep the Yaadro fallback. The next visit tries again.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ShopNameProvider name={shop?.name ?? "Yaadro"}>{children}</ShopNameProvider>;
}
