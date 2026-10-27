"use client";

import { useCallback, useState } from "react";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { useTypeScale } from "@/components/ui/TypeScaleContext";

/**
 * Home body below the category rail: category products → produce band →
 * Featured / Most ordered / Favourites → brand footer. PTR remounts all;
 * real catalog refetch plugs into onRefresh later. Offer banners sit above
 * the rail.
 */
export function HomePullContent() {
  const t = useTypeScale();
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div key={refreshKey}>
        <ProductSection />
        <FruitsVeggiesSection className={t.homeBlockGap} />
        <HomeProductShelves className={t.homeBlockGap} />
        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}
