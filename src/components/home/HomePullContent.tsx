"use client";

import { useCallback } from "react";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { refreshStorefrontCatalog } from "@/lib/api/refresh-catalog";
import type { CategoryBrowseSection } from "@/lib/home-category-browse";
import type { SampleProduct } from "@/lib/sample-products";
import type { LiveShelf } from "@/components/home/HomeProductShelves";

/**
 * Home body below the category rail: category products → produce → aisle
 * browse (#30) → shelves → brand footer. Offer banners sit above the rail.
 */
export function HomePullContent({
  productsBySlug,
  categoryNames,
  fruits,
  vegetables,
  shelves,
  browseSections,
  catalogError,
}: {
  productsBySlug?: Record<string, SampleProduct[]>;
  categoryNames?: Record<string, string>;
  fruits?: SampleProduct[];
  vegetables?: SampleProduct[];
  shelves?: LiveShelf[];
  /** Live aisle sections from category branches (#30). */
  browseSections?: CategoryBrowseSection[];
  catalogError?: string | null;
}) {
  const t = useTypeScale();

  const onRefresh = useCallback(async () => {
    await refreshStorefrontCatalog();
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div>
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
        {browseSections && browseSections.length > 0 ? (
          <CategoryBrowseSections
            sections={browseSections}
            layout="rect-first"
            className={t.homeBlockGap}
          />
        ) : null}
        <HomeProductShelves className={t.homeBlockGap} shelves={shelves} />
        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}
