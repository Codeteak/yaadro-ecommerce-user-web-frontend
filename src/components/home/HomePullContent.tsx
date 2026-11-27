"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ProductCard } from "@/components/product/ProductCard";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { ConnectionStatusChip } from "@/components/storefront/ConnectionStatusChip";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { showPopup } from "@/components/ui/Toast";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { refreshStorefrontCatalog } from "@/lib/api/refresh-catalog";
import {
  readHomeEssentialsSnapshot,
  saveHomeEssentialsSnapshot,
} from "@/lib/home-essentials-snapshot";
import {
  HOME_BODY_LAYOUT,
  type HomeBodyLayout,
} from "@/lib/home-section-order";
import { useConnectionChipKind } from "@/lib/use-connection-chip";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { SampleProduct } from "@/lib/sample-products";

export type HomeRailCategory = {
  name: string;
  slug: string;
  image: string;
};

function flattenProducts(
  productsBySlug?: Record<string, SampleProduct[]>,
): SampleProduct[] {
  if (!productsBySlug) return [];
  const seen = new Set<string>();
  const out: SampleProduct[] = [];
  for (const bucket of Object.values(productsBySlug)) {
    for (const product of bucket) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      out.push(product);
    }
  }
  return out;
}

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
  const connectionChip = useConnectionChipKind();
  const [retrying, setRetrying] = useState(false);
  /** Save-Data: essentials (rail + All strip) first; tap to reveal shelves. */
  const [loadMoreShelves, setLoadMoreShelves] = useState(false);
  const [offlineSnapshot, setOfflineSnapshot] = useState<SampleProduct[] | null>(
    null,
  );
  const essentialsOnly = connectionChip === "saver" && !loadMoreShelves;

  const liveProducts = useMemo(
    () => flattenProducts(productsBySlug),
    [productsBySlug],
  );

  const liveCatalogUsable =
    !catalogError &&
    (liveProducts.length > 0 ||
      railCategories === undefined ||
      (railCategories?.length ?? 0) > 0);

  /** Offline and nothing usable from this paint → snapshot or cold empty. */
  const useOfflineFallback = !online && !liveCatalogUsable;

  useEffect(() => {
    if (!online || liveProducts.length === 0) return;
    saveHomeEssentialsSnapshot(liveProducts);
  }, [online, liveProducts]);

  useEffect(() => {
    if (!useOfflineFallback) {
      setOfflineSnapshot(null);
      return;
    }
    setOfflineSnapshot(readHomeEssentialsSnapshot());
  }, [useOfflineFallback]);

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

  const favouritesBlock = shelves ? (
    <HomeFavouritesShelf className={t.homeBlockGap} live />
  ) : (
    <HomeProductShelves className={t.homeBlockGap} />
  );

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
          <OfflineStatusBanner
            className="pt-4"
            tone={
              useOfflineFallback && !offlineSnapshot ? "reconnect" : "cached"
            }
            onRetry={onRetryCatalog}
          />
        ) : connectionChip ? (
          <ConnectionStatusChip kind={connectionChip} className="pt-4" />
        ) : null}

        {useOfflineFallback ? (
          offlineSnapshot && offlineSnapshot.length > 0 ? (
            <OfflineCachedEssentials products={offlineSnapshot} />
          ) : (
            <OfflineColdEmpty onRetry={onRetryCatalog} retrying={retrying} />
          )
        ) : (
          <>
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

            {/* Essentials: category rail (above) + All product strip */}
            {allStrip}

            {essentialsOnly ? (
              <div className="mx-auto flex w-full max-w-lg justify-center px-5 pt-5 pb-2">
                <button
                  type="button"
                  onClick={() => setLoadMoreShelves(true)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-track px-5 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  Load more shelves
                </button>
              </div>
            ) : layout === "canonical" ? (
              <>
                {adminBlock}
                {produceBlock}
                {categoryRailsBlock}
                {favouritesBlock}
              </>
            ) : (
              <>
                {produceBlock}
                {categoryRailsBlock}
                {adminBlock}
                {favouritesBlock}
              </>
            )}
          </>
        )}

        <BrandFooter />
      </div>
    </PullToRefresh>
  );
}

function OfflineCachedEssentials({ products }: { products: SampleProduct[] }) {
  return (
    <section className="mx-auto w-full max-w-lg px-4 pt-4 opacity-85">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-forest">
          Saved essentials
        </h2>
        <p className="text-[10px] font-bold tracking-wide text-amber-900/80 uppercase">
          May be outdated
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} forceLiteMedia />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[11px] font-semibold text-amber-900/80">
        Prices may be outdated until you reconnect.
      </p>
    </section>
  );
}

function OfflineColdEmpty({
  onRetry,
  retrying,
}: {
  onRetry: () => void | Promise<void>;
  retrying: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg px-5 pt-10 pb-6 text-center">
      <p className="text-[15px] font-extrabold text-forest">
        Nothing saved for offline
      </p>
      <p className="mt-2 text-[13px] leading-5 text-muted">
        Open home once while online so we can keep a lightweight essentials
        snapshot for next time.
      </p>
      <button
        type="button"
        disabled={retrying}
        onClick={() => void onRetry()}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-track px-5 text-sm font-bold text-black disabled:opacity-60"
      >
        {retrying ? "Trying…" : "Try again"}
      </button>
    </div>
  );
}
