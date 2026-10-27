"use client";

import { useCallback, useState } from "react";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

/**
 * Home body below the category rail: category products → produce band →
 * Featured / Most ordered / Favourites. PTR remounts all; real catalog
 * refetch plugs into onRefresh later. Offer banners sit above the rail.
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
        <HomeProductShelves className="mt-2" />
      </div>
    </PullToRefresh>
  );
}
