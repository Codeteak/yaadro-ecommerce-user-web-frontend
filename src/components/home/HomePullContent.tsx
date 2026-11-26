"use client";

import { useCallback, useState } from "react";
import {
  CategoryProductRails,
  type CategoryProductRailView,
} from "@/components/home/CategoryProductRails";
import { CategoryRail } from "@/components/home/CategoryRail";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeAdminShelves } from "@/components/home/HomeAdminShelves";
import {
  HomeFavouritesShelf,
  HomeProductShelves,
  type LiveShelf,
} from "@/components/home/HomeProductShelves";
import { ProductSection } from "@/components/home/ProductSection";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { showPopup } from "@/components/ui/Toast";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { refreshStorefrontCatalog } from "@/lib/api/refresh-catalog";
import {
  HOME_BODY_LAYOUT,
  type HomeBodyLayout,
} from "@/lib/home-section-order";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { SampleProduct } from "@/lib/sample-products";

export type HomeRailCategory = {
  name: string;
  slug: string;
  image: string;
};

/**
 * Home body — each shop’s admin `sort_order` after the pill-driven All strip;
 * fruits/veggies next; category product rails always last before favourites.
 */
export function HomePullContent({
  railCategories,
  productsBySlug,
  categoryNames,
  fruits,
  vegetables,
  shelves,
  categoryRails,
  catalogError,
  layout = HOME_BODY_LAYOUT,
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
  /** Per-category horizontal product rows — always after produce. */
  categoryRails?: CategoryProductRailView[];
  catalogError?: string | null;
  /** `legacy-buried` only for playground compare. */
  layout?: HomeBodyLayout;
}) {
  const t = useTypeScale();
  const online = useOnlineStatus();
  const [retrying, setRetrying] = useState(false);

  const showProduce =
    fruits == null ||
    vegetables == null ||
    fruits.length > 0 ||
    vegetables.length > 0;

  const adminBlock =
    shelves && shelves.length > 0 ? (
      <HomeAdminShelves shelves={shelves} />
    ) : null;

  const allStrip = (
    <ProductSection
      productsBySlug={productsBySlug}
      categoryNames={categoryNames}
    />
  );

  const produceBlock = showProduce ? (
    <FruitsVeggiesSection
      className={t.homeBlockGap}
      fruits={fruits}
      vegetables={vegetables}
    />
  ) : null;

  const categoryRailsBlock =
    categoryRails && categoryRails.length > 0 ? (
      <CategoryProductRails
        rails={categoryRails}
        className={t.homeBlockGap}
      />
    ) : null;

  const onRefresh = useCallback(async () => {
    await refreshStorefrontCatalog();
  }, []);

  const onRetryCatalog = useCallback(async () => {
    if (retrying) return;
    if (!navigator.onLine) {
      showPopup("Couldn't refresh. Check your connection.", "error");
      return;
    }
    setRetrying(true);
    try {
      await refreshStorefrontCatalog();
    } catch {
      showPopup("Couldn't refresh. Check your connection.", "error");
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div>
        {!online ? (
          <p
            role="status"
            className="mx-auto w-full max-w-lg px-5 pt-4 text-[13px] font-semibold text-amber-900"
          >
            <span className="inline-block rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200/80">
              You&apos;re offline. Showing what was loaded.
            </span>
          </p>
        ) : null}

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
          <div className="mx-auto w-full max-w-lg px-5 pt-6">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-forest/10 shadow-[0_8px_24px_rgba(47,107,47,0.1)]">
              <p className="text-sm font-bold text-black">
                We couldn&apos;t load the shop.
              </p>
              <p className="mt-1 text-[13px] leading-5 text-muted">
                {catalogError}
              </p>
              <button
                type="button"
                disabled={retrying || !online}
                onClick={() => void onRetryCatalog()}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-ink ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retrying ? "Trying…" : "Try again"}
              </button>
            </div>
          </div>
        ) : null}

        {layout === "canonical" ? (
          <>
            {allStrip}
            {adminBlock}
            {produceBlock}
            {categoryRailsBlock}
          </>
        ) : (
          <>
            {allStrip}
            {produceBlock}
            {categoryRailsBlock}
            {adminBlock}
          </>
        )}

        {shelves ? (
          <HomeFavouritesShelf className={t.homeBlockGap} live />
        ) : (
          <HomeProductShelves className={t.homeBlockGap} />
        )}
        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}
