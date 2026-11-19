"use server";

import type { SampleProduct } from "@/lib/sample-products";
import { getShopSeo, type ShopSeo } from "@/lib/shop-seo";
import {
  getStoreProduct,
  listStoreProducts,
  loadCategoryBrowser,
  loadCategoryListing,
  loadHomeCatalog,
  type CategoryBrowserData,
  type CategoryListingData,
  type HomeCatalog,
} from "@/lib/api/storefront";

export type HomePageData = {
  shop: ShopSeo;
  catalog: HomeCatalog;
};

export async function loadShopPageData(): Promise<ShopSeo> {
  return getShopSeo();
}

/**
 * Home payload for the browser cache.
 * Flat `products` are unused on this screen (shelves / by-slug cover it), so
 * they are cleared. `branches` stay for aisle browse sections (#30).
 */
export async function loadHomePageData(): Promise<HomePageData> {
  const [shop, catalog] = await Promise.all([getShopSeo(), loadHomeCatalog()]);
  return {
    shop,
    catalog: {
      ...catalog,
      products: [],
    },
  };
}

export async function loadCategoriesPageData(
  cat: string | undefined,
): Promise<CategoryBrowserData> {
  return loadCategoryBrowser(cat);
}

export async function loadCategoryPageData(
  slug: string,
): Promise<CategoryListingData | null> {
  return loadCategoryListing(slug);
}

export type ProductPageData = {
  product: SampleProduct;
  related: SampleProduct[];
  seoTitle?: string;
  seoDescription?: string;
};

export async function loadProductPageData(id: string): Promise<ProductPageData | null> {
  const result = await getStoreProduct(id);
  if (!result) return null;
  let related: SampleProduct[] = [];
  if (result.product.categoryId) {
    const groups = await listStoreProducts({ categoryId: result.product.categoryId });
    related = groups
      .flatMap((group) => group.products)
      .filter((product) => product.id !== result.product.id)
      .slice(0, 6);
  }
  return { ...result, related };
}
