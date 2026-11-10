import type { Metadata } from "next";
import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { loadHomeCatalog } from "@/lib/api/storefront";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Home",
  description: "Fresh groceries, right at your door — shop Yaadro.",
};

export default async function StorefrontHomePage() {
  const [shop, catalog] = await Promise.all([getShopSeo(), loadHomeCatalog()]);
  const categoryNames = {
    [ALL_CATEGORY_SLUG]: "All",
    ...Object.fromEntries(
      catalog.categories.map((category) => [category.slug, category.name]),
    ),
  };
  return (
    <HomeCategoryProvider>
      <ScrollToTopOnLoad />
      <main className="relative min-h-dvh overflow-x-clip bg-paper">
        <section className="relative">
          <div className="relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8]">
            {/* soft decorative rings */}
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
              />
            </div>

            <div className="relative mt-4 pb-6">
              <OfferBanners
                banners={shop.banners.length > 0 ? shop.banners : undefined}
              />
            </div>

            {/* curved bottom edge — ends higher, middle dipped */}
            <svg
              className="absolute inset-x-0 bottom-0 h-[64px] w-full text-paper"
              viewBox="0 0 1440 70"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 18 C 360 66, 1080 66, 1440 18 L1440 70 L0 70 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="relative z-10 mx-auto mt-2 w-full max-w-lg">
            <CategoryRail
              categories={catalog.categories.map((category) => ({
                name: category.name,
                slug: category.slug,
                image: category.image,
              }))}
            />
          </div>
        </section>

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
          catalogError={catalog.error}
        />

        <OfferFlyer />
      </main>
    </HomeCategoryProvider>
  );
}
