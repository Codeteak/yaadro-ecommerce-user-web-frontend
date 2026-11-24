"use client";

import { useCallback, useMemo } from "react";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { CategoryRail } from "@/components/home/CategoryRail";
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

export type HomeRailCategory = {
  name: string;
  slug: string;
  image: string;
};

/**
 * Home body: sellable category rail + products → produce → dairy → aisle
 * browse → festive → shelves → brand footer.
 * Rail categories come from the same catalog load as products (no empty aisles).
 */
export function HomePullContent({
  railCategories,
  productsBySlug,
  categoryNames,
  fruits,
  vegetables,
  shelves,
  browseSections,
  catalogError,
}: {
  /**
   * Sellable root categories. `undefined` = playground sample rail;
   * `[]` = hide rail (live catalog failed / empty).
   */
  railCategories?: HomeRailCategory[];
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

  const showProduce =
    fruits == null ||
    vegetables == null ||
    fruits.length > 0 ||
    vegetables.length > 0;

  const onRefresh = useCallback(async () => {
    await refreshStorefrontCatalog();
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div>
        {railCategories === undefined ? (
          <div className="relative z-10 mx-auto w-full max-w-lg">
            <CategoryRail tileVariant="pill" />
          </div>
        ) : railCategories.length > 0 ? (
          <div className="relative z-10 mx-auto w-full max-w-lg">
            <CategoryRail tileVariant="pill" categories={railCategories} />
          </div>
        ) : null}
        {catalogError ? (
          <p className="mx-auto w-full max-w-lg px-5 pt-6 text-sm font-medium text-muted">
            {catalogError}
          </p>
        ) : null}
        <ProductSection
          productsBySlug={productsBySlug}
          categoryNames={categoryNames}
        />
        {showProduce ? (
          <FruitsVeggiesSection
            className={t.homeBlockGap}
            fruits={fruits}
            vegetables={vegetables}
          />
        ) : null}
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
