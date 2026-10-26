"use client";

import { useCallback, useState } from "react";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

/**
 * Home product grid below the category rail. Pull-to-refresh is UI-only
 * for now (remounts the grid); real catalog refetch plugs into onRefresh later.
 * Offer banners sit above the rail on `/home`, not here.
 */
export function HomePullContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div key={refreshKey}>
        <ProductSection />
      </div>
    </PullToRefresh>
  );
}
