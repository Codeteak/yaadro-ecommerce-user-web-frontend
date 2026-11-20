"use client";

import { HomeTopBar } from "@/components/home/HomeTopBar";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { CategoryRail } from "@/components/home/CategoryRail";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { HOME_CATEGORIES } from "@/lib/home-categories";

/**
 * Phase B #30 playground — richer home stack (aisle browse + shelves).
 * Live /home stays classic until confirmed.
 */
export function PhaseBHomeSectionsDemo() {
  return (
    <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper ring-1 ring-black/5">
      <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-3">
        <HomeTopBar
          shopName="Yaadro"
          shopImage="/onboarding/brand-mark-white-y.svg"
          signedIn
        />
        <HomeSearchBar className="mt-4" navigateOnSubmit={false} />
        <div className="mt-4 -mx-5">
          <OfferBanners allowSample />
        </div>
      </div>

      <HomeCategoryProvider>
        <CategoryRail
          tileVariant="pill"
          categories={HOME_CATEGORIES.map((c) => ({
            name: c.name,
            slug: c.name,
            image: c.image,
          }))}
        />
      </HomeCategoryProvider>

      <FruitsVeggiesSection />
      <CategoryBrowseSections
        layout="rect-first"
        className="bg-paper [&_h2]:text-ink"
        hrefFor={(slug) => `/playground/category-browser?cat=${slug}`}
      />
      <HomeProductShelves />
      <BrandFooter />
      <WeightCustomizer />
    </div>
  );
}
