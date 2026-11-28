import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DeferredLocationPrompt } from "@/components/delivery/DeferredLocationPrompt";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import {
  HOME_SEARCH_SAMPLE_TERMS,
  HomeSearchBar,
} from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { PrefetchStorefrontRoute } from "@/components/navigation/PrefetchStorefrontRoute";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import {
  CategoryRailSkeleton,
  HomeCatalogSkeleton,
  HomeHeroSkeleton,
} from "@/components/ui/skeletons";
import { loadHomeCatalog } from "@/lib/api/storefront";
import { categoryProductRails } from "@/lib/home-category-rails";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";
import { cn } from "@/lib/cn";
import { getRequestShopId } from "@/lib/request-shop";
import { getShopSeo, type ShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Home",
  description: "Fresh groceries, right at your door — shop Yaadro.",
};

/** Presentational hero — safe for Suspense fallback (no awaits). */
function HomeHeroView({
  shop,
  banners,
}: {
  shop: Pick<ShopSeo, "name" | "image">;
  banners?: ReactNode;
}) {
  return (
    <section className="relative">
      <div className="relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8]">
        <div
          className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full border-[1.25rem] border-white/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-24 right-[38%] h-20 w-20 rounded-full bg-white/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -bottom-24 h-56 w-56 rounded-full border-[1.5rem] border-leaf/10"
          aria-hidden
        />

        <div
          className={cn(
            "relative mx-auto w-full max-w-lg px-5 pt-[max(1rem,env(safe-area-inset-top))]",
            banners ? undefined : "pb-6",
          )}
        >
          <HomeTopBar shopName={shop.name} shopImage={shop.image} />
          <HomeSearchBar
            className="mt-4"
            activateHref="/categories?focus=search"
            filterHref="/categories?focus=search&chips=1"
            placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
            placeholderMotion="typewriter"
          />
        </div>

        {banners ? (
          <div className="relative mt-4 pb-3">{banners}</div>
        ) : null}

        <svg
          className="absolute inset-x-0 bottom-0 h-[36px] w-full text-paper"
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 10 C 360 36, 1080 36, 1440 10 L1440 40 L0 40 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

/**
 * Resolves shop once (shared with rail/catalog via request cache), then paints
 * real name/banners. Hero skeleton reserves the banner slot so promo shops
 * do not expand the hero when SEO resolves (CLS).
 */
async function HomeHeroResolved() {
  const shop = await getShopSeo();
  return (
    <HomeHeroView
      shop={shop}
      banners={
        shop.banners?.length ? (
          <OfferBanners banners={shop.banners} />
        ) : undefined
      }
    />
  );
}

/**
 * Sellable category rail + home body from one catalog load.
 * Admin shelves keep shop_home_sections.sort_order (enabled + dated + products).
 * Empty / failed catalog → no orphan category rail without products.
 */
async function HomeCatalogBody() {
  const shopId = await getRequestShopId();
  const catalog = await loadHomeCatalog(shopId);
  const categoryNames = {
    [ALL_CATEGORY_SLUG]: "All",
    ...Object.fromEntries(
      catalog.categories.map((category) => [category.slug, category.name]),
    ),
  };

  return (
    <HomePullContent
      railCategories={
        catalog.ok
          ? catalog.categories.map((category) => ({
              name: category.name,
              slug: category.slug,
              image: category.image,
            }))
          : []
      }
      productsBySlug={catalog.ok ? catalog.productsBySlug : {}}
      categoryNames={categoryNames}
      fruits={catalog.ok ? catalog.fruits : []}
      vegetables={catalog.ok ? catalog.vegetables : []}
      shelves={
            catalog.ok
              ? catalog.shelves.map((shelf) => ({
                  id: shelf.id,
                  title: shelf.title,
                  sortOrder: shelf.sortOrder,
                  products: shelf.products,
                }))
              : []
          }
      categoryRails={
        catalog.ok
          ? categoryProductRails(catalog.categories, catalog.productsBySlug)
          : []
      }
      catalogError={catalog.error}
    />
  );
}

export default function StorefrontHomePage() {
  return (
    <HomeCategoryProvider>
      <ScrollToTopOnLoad />
      <main className="relative min-h-dvh overflow-x-clip bg-paper">
        <Suspense fallback={<HomeHeroSkeleton />}>
          <HomeHeroResolved />
        </Suspense>

        <Suspense
          fallback={
            <>
              <CategoryRailSkeleton />
              <HomeCatalogSkeleton />
            </>
          }
        >
          <HomeCatalogBody />
        </Suspense>

        {/* Soft location prompt only — offer flyer removed (scroll-lock races). */}
        <DeferredLocationPrompt />
        {/* Warm routes while home is idle so search / See all taps feel instant. */}
        <PrefetchStorefrontRoute href="/categories" />
        <PrefetchStorefrontRoute href="/categories?focus=search" />
        <PrefetchStorefrontRoute href="/dairy" />
        <PrefetchStorefrontRoute href="/deals" />
        <PrefetchStorefrontRoute href="/festive" />
      </main>
    </HomeCategoryProvider>
  );
}
