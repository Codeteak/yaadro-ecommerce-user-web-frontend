"use client";

import { useCallback, useState } from "react";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

/**
 * Home body below the category rail: compact category products, then
 * fruits & veggies band. Pull-to-refresh is UI-only for now (remounts
 * both); real catalog refetch plugs into onRefresh later.
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
        <FruitsVeggiesSection className="mt-2" />
      </div>
    </PullToRefresh>
  );
}
