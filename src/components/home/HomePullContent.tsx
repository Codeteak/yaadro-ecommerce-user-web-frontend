"use client";

import { useCallback, useMemo } from "react";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { DailyDairySection } from "@/components/home/DailyDairySection";
import { FestiveOffersSection } from "@/components/home/FestiveOffersSection";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { refreshStorefrontCatalog } from "@/lib/api/refresh-catalog";
import {
  isDairySectionTitle,
  pickDairyShelf,
} from "@/lib/daily-dairy";
import {
  isFestiveSectionTitle,
  pickFestiveShelf,
} from "@/lib/festive-offers";
import type { CategoryBrowseSection } from "@/lib/home-category-browse";
import type { SampleProduct } from "@/lib/sample-products";
import type { LiveShelf } from "@/components/home/HomeProductShelves";

/**
 * Home body below the category rail: category products → produce → dairy
 * (layout A when shelf title matches) → aisle browse (#30) → festive →
 * shelves → brand footer. Offer banners sit above the rail.
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

  const dairyShelf = useMemo(() => pickDairyShelf(shelves), [shelves]);
  const festiveShelf = useMemo(
    () => pickFestiveShelf(shelves),
    [shelves],
  );
  const regularShelves = useMemo(() => {
    if (!shelves) return shelves;
    return shelves.filter(
      (shelf) =>
        !isFestiveSectionTitle(shelf.title) &&
        !isDairySectionTitle(shelf.title),
    );
  }, [shelves]);

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
        {dairyShelf ? (
          <DailyDairySection
            className={t.homeBlockGap}
            layout="on-art"
            shelf={dairyShelf}
            browseHref="/dairy"
          />
        ) : null}
        {browseSections && browseSections.length > 0 ? (
          <CategoryBrowseSections
            sections={browseSections}
            layout="rect-first"
            className={t.homeBlockGap}
          />
        ) : null}
        {festiveShelf ? (
          <FestiveOffersSection
            className={t.homeBlockGap}
            shelf={festiveShelf}
            seeAllHref="/festive"
          />
        ) : null}
        <HomeProductShelves className={t.homeBlockGap} shelves={regularShelves} />
        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}
