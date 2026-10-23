"use client";

import { useCallback, useState } from "react";
import { OfferBanners } from "@/components/home/OfferBanners";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

/**
 * Home content below the category rail. Pull-to-refresh is UI-only for
 * now (remounts the product grid); real catalog refetch plugs into
 * onRefresh later.
 */
export function HomePullContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <OfferBanners />
      <div key={refreshKey}>
        <ProductSection />
      </div>
    </PullToRefresh>
  );
}
