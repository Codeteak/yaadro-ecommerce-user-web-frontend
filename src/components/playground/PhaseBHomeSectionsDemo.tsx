"use client";

import { useMemo } from "react";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { OfferBanners } from "@/components/home/OfferBanners";
import { CategoryRail } from "@/components/home/CategoryRail";
import { CategoryProductRails } from "@/components/home/CategoryProductRails";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { catalogSlugForHomeCategory } from "@/lib/catalog-taxonomy";
import { categoryProductRails } from "@/lib/home-category-rails";
import { HOME_CATEGORIES } from "@/lib/home-categories";
import { getProductsByCategory } from "@/lib/sample-products";

/**
 * Playground home stack: produce + per-category product rails + shelves.
 * Matches live `/home` after the category-tile → product-rail change.
 */
export function PhaseBHomeSectionsDemo() {
  const rails = useMemo(() => {
    const categories = HOME_CATEGORIES.map((c) => ({
      slug: catalogSlugForHomeCategory(c.name),
      name: c.name,
    }));
    const productsBySlug = Object.fromEntries(
      HOME_CATEGORIES.map((c) => [
        catalogSlugForHomeCategory(c.name),
        getProductsByCategory(c.name),
      ]),
    );
    return categoryProductRails(categories, productsBySlug);
  }, []);

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
            slug: catalogSlugForHomeCategory(c.name),
            image: c.image,
          }))}
        />
      </HomeCategoryProvider>

      <FruitsVeggiesSection />
      <CategoryProductRails rails={rails} className="bg-paper" />
      <HomeProductShelves />
      <BrandFooter />
      <WeightCustomizer />
    </div>
  );
}
