import type { Metadata } from "next";
import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Home",
  description: "Fresh groceries, right at your door — shop Yaadro.",
};

export default async function StorefrontHomePage() {
  const shop = await getShopSeo();
  // Until the shop-profile API exists there is no per-shop photo, so the
  // avatar uses the white-Y D mark instead of the wide OG banner.
  const shopImage = process.env.NEXT_PUBLIC_SHOP_PROFILE_URL
    ? shop.image
    : "/onboarding/brand-mark-white-y.svg";
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
              <HomeTopBar shopName={shop.name} shopImage={shopImage} />
              <HomeSearchBar
                className="mt-4"
                activateHref="/categories?focus=search"
              />
            </div>

            <div className="relative mt-4 pb-16">
              <OfferBanners />
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

          {/* category circles riding the curve */}
          <div className="relative z-10 mx-auto -mt-[4.25rem] w-full max-w-lg">
            <CategoryRail />
          </div>
        </section>

        <HomePullContent />

        <OfferFlyer />
      </main>
    </HomeCategoryProvider>
  );
}
