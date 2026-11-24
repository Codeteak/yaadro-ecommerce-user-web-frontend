"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useHomeCategory } from "@/components/home/HomeCategoryContext";
import { ProductRail } from "@/components/home/ProductRail";
import { ProductRailSkeleton } from "@/components/ui/skeletons";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import {
  fetchHomeAisleProducts,
  getHomeAisleCacheServerVersion,
  getHomeAisleCacheVersion,
  peekHomeAisleCache,
  peekHomeAisleFailed,
  retryHomeAisleProducts,
  subscribeHomeAisleCache,
} from "@/lib/home-aisle-client";
import { catalogSlugForHomeCategory } from "@/lib/catalog-taxonomy";
import {
  ALL_CATEGORY_SLUG,
  HOME_CATEGORIES,
  type HomeCategory,
} from "@/lib/home-categories";
import {
  getProductsByCategory,
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

function isHomeCategory(value: string): value is HomeCategory {
  return HOME_CATEGORIES.some((category) => category.name === value);
}

function productsForAll(productsBySlug: Record<string, SampleProduct[]>) {
  const seen = new Set<string>();
  const products: SampleProduct[] = [];
  for (const bucket of Object.values(productsBySlug)) {
    for (const product of bucket) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }
  return products;
}

/** One scrolling row up to this count. More than this splits into two rows. */
const ONE_ROW_MAX = 10;

/**
 * Home product listing for the category selected in the rail above.
 * All uses the light home sample. Other aisles use the sample bucket when
 * present; if empty, lazy-fetch that category (same scope as Show all / PLP).
 */
export function ProductSection({
  productsBySlug,
  categoryNames,
}: {
  /** Live products keyed by category slug. Omit to keep the sample aisle. */
  productsBySlug?: Record<string, SampleProduct[]>;
  categoryNames?: Record<string, string>;
}) {
  const t = useTypeScale();
  const { selected } = useHomeCategory();
  const live = productsBySlug != null;
  const showingAll = selected === ALL_CATEGORY_SLUG;

  // Re-render when aisle cache fills (prefetch or lazy fetch) — no sync setState.
  useSyncExternalStore(
    subscribeHomeAisleCache,
    getHomeAisleCacheVersion,
    getHomeAisleCacheServerVersion,
  );

  const sampleBucket =
    live && !showingAll ? (productsBySlug[selected] ?? []) : null;
  const sampleLen = sampleBucket?.length ?? 0;

  const aisleFailed = live && !showingAll && peekHomeAisleFailed(selected);

  useEffect(() => {
    if (!live || showingAll) return;
    if (sampleLen > 0) return;
    if (peekHomeAisleCache(selected) !== undefined) return;
    if (peekHomeAisleFailed(selected)) return;

    void fetchHomeAisleProducts(selected);
  }, [live, showingAll, selected, sampleLen]);

  const lazyProducts = peekHomeAisleCache(selected);

  const products = showingAll
    ? live
      ? productsForAll(productsBySlug)
      : SAMPLE_PRODUCTS
    : live
      ? sampleLen > 0
        ? sampleBucket!
        : (lazyProducts ?? [])
      : isHomeCategory(selected)
        ? getProductsByCategory(selected)
        : [];

  /** Empty sample + not yet cached → fetch in flight (or about to). */
  const loading =
    live &&
    !showingAll &&
    sampleLen === 0 &&
    lazyProducts === undefined &&
    !aisleFailed;

  const twoRows = products.length > ONE_ROW_MAX;
  const mid = twoRows ? Math.ceil(products.length / 2) : products.length;
  const rowTop = products.slice(0, mid);
  const rowBottom = twoRows ? products.slice(mid) : [];

  return (
    <section
      aria-label={`${categoryNames?.[selected] ?? selected} products`}
      className="mx-auto w-full max-w-lg pt-6"
    >
      <div
        className={cn(
          "flex items-end justify-between px-5",
          t.homeShowAllGap,
        )}
      >
        <div>
          <h2 className={t.homeSectionHeading}>
            {categoryNames?.[selected] ?? selected}
          </h2>
          <p className={t.homeSectionSubtitle}>
            {live
              ? "From this shop"
              : "Sample products — real catalog coming soon"}
          </p>
        </div>
        <Link
          href={
            showingAll
              ? "/categories"
              : live
                ? `/categories/${selected}`
                : isHomeCategory(selected)
                  ? `/categories/${catalogSlugForHomeCategory(selected)}`
                  : "/categories"
          }
          transitionTypes={["nav-forward"]}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Show all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div
        key={selected}
        className={cn(
          "onboarding-fade-up flex flex-col gap-1",
          t.homeSectionToGrid,
        )}
      >
        {loading ? (
          <ProductRailSkeleton className="px-5" count={4} />
        ) : aisleFailed ? (
          <div className="flex flex-col items-start gap-2 px-5 py-6">
            <p className="text-sm font-medium text-muted">
              We couldn&apos;t load this aisle. Check your connection and try
              again.
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-leaf underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              onClick={() => {
                void retryHomeAisleProducts(selected);
              }}
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <p className="px-5 py-6 text-sm font-medium text-muted">
            Nothing in this aisle yet.
          </p>
        ) : (
          <ProductRail
            products={rowTop}
            label={twoRows ? `${selected} row 1` : selected}
            priorityCount={showingAll ? 2 : 0}
          />
        )}
        {!loading && rowBottom.length > 0 ? (
          <ProductRail
            products={rowBottom}
            label={`${selected} row 2`}
          />
        ) : null}
      </div>
    </section>
  );
}
