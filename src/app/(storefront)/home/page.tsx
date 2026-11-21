import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DeferredLocationPrompt } from "@/components/delivery/DeferredLocationPrompt";
import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import {
  HOME_SEARCH_SAMPLE_TERMS,
  HomeSearchBar,
} from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { HomeShelfSkeleton } from "@/components/ui/skeletons";
import {
  listStoreCategories,
  loadHomeCatalog,
} from "@/lib/api/storefront";
import { browseSectionsFromBranches } from "@/lib/home-category-browse";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";
import { getRequestShopId } from "@/lib/request-shop";
import { getShopSeo, SHOP_SEO_FALLBACK, type ShopSeo } from "@/lib/shop-seo";

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

        <div className="relative mx-auto w-full max-w-lg px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <HomeTopBar shopName={shop.name} shopImage={shop.image} />
          <HomeSearchBar
            className="mt-4"
            activateHref="/categories?focus=search"
            filterHref="/categories?focus=search&chips=1"
            placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
            placeholderMotion="typewriter"
          />
        </div>

        <div className="relative mt-4 pb-3">{banners}</div>

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
 * real name/banners. Suspense fallback shows the same chrome immediately.
 */
async function HomeHeroResolved() {
  const shop = await getShopSeo();
  return (
    <HomeHeroView
      shop={shop}
      banners={<OfferBanners banners={shop.banners} />}
    />
  );
}

/**
 * Category rail only — categories query, not the full product catalog (#3).
 */
async function HomeCategoryRail() {
  const shopId = await getRequestShopId();
  const categories = await listStoreCategories(shopId);
  const roots = categories.filter(
    (category) => !category.parentId && category.slug !== "all",
  );

  return (
    <div className="relative z-10 mx-auto w-full max-w-lg">
      <CategoryRail
        tileVariant="pill"
        categories={roots.map((category) => ({
          name: category.name,
          slug: category.slug,
          image: category.image,
        }))}
      />
    </div>
  );
}

/**
 * Product sections + shelves — lighter query, streams after the rail.
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
      productsBySlug={catalog.ok ? catalog.productsBySlug : {}}
      categoryNames={categoryNames}
      fruits={catalog.ok ? catalog.fruits : []}
      vegetables={catalog.ok ? catalog.vegetables : []}
      shelves={
        catalog.ok
          ? catalog.shelves.map((shelf) => ({
              id: shelf.id,
              title: shelf.title,
              products: shelf.products,
            }))
          : []
      }
      browseSections={
        catalog.ok ? browseSectionsFromBranches(catalog.branches) : []
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
        <Suspense
          fallback={
            <HomeHeroView
              shop={SHOP_SEO_FALLBACK}
              banners={null}
            />
          }
        >
          <HomeHeroResolved />
        </Suspense>

        <Suspense
          fallback={
            <div className="mx-auto h-16 w-full max-w-lg animate-pulse bg-mint/40" />
          }
        >
          <HomeCategoryRail />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-8 py-6">
              <HomeShelfSkeleton />
              <HomeShelfSkeleton />
            </div>
          }
        >
          <HomeCatalogBody />
        </Suspense>

        <OfferFlyer />
        {/* #7 — after paint, open address sheet only when Deliver to is empty */}
        <DeferredLocationPrompt />
      </main>
    </HomeCategoryProvider>
  );
}
