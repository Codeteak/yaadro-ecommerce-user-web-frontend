"use client";

import { useCallback, useState } from "react";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import type { SampleProduct } from "@/lib/sample-products";
import type { LiveShelf } from "@/components/home/HomeProductShelves";

/**
 * Home body below the category rail: category products → produce band →
 * Featured / Most ordered / Favourites → brand footer. PTR remounts all;
 * real catalog refetch plugs into onRefresh later. Offer banners sit above
 * the rail.
 */
export function HomePullContent({
  productsBySlug,
  categoryNames,
  fruits,
  vegetables,
  shelves,
  catalogError,
}: {
  productsBySlug?: Record<string, SampleProduct[]>;
  categoryNames?: Record<string, string>;
  fruits?: SampleProduct[];
  vegetables?: SampleProduct[];
  shelves?: LiveShelf[];
  catalogError?: string | null;
}) {
  const t = useTypeScale();
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div key={refreshKey}>
        {catalogError ? (
          <p className="mx-auto w-full max-w-lg px-5 pt-6 text-sm font-medium text-muted">
            {catalogError}
          </p>
        ) : null}
        <ProductSection
          productsBySlug={productsBySlug}
          categoryNames={categoryNames}
        />
        <FruitsVeggiesSection
          className={t.homeBlockGap}
          fruits={fruits}
          vegetables={vegetables}
        />
        <HomeProductShelves className={t.homeBlockGap} shelves={shelves} />
        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}
