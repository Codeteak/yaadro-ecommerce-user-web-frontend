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
import { getRequestShopId } from "@/lib/request-shop";

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
  const shopId = await getRequestShopId();
  const [shop, catalog] = await Promise.all([getShopSeo(), loadHomeCatalog(shopId)]);
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
  const shopId = await getRequestShopId();
  return loadCategoryBrowser(shopId, cat);
}

export async function loadCategoryPageData(
  slug: string,
): Promise<CategoryListingData | null> {
  const shopId = await getRequestShopId();
  return loadCategoryListing(shopId, slug);
}

export type ProductPageData = {
  product: SampleProduct;
  related: SampleProduct[];
  seoTitle?: string;
  seoDescription?: string;
};

export async function loadProductPageData(id: string): Promise<ProductPageData | null> {
  const shopId = await getRequestShopId();
  const result = await getStoreProduct(shopId, id);
  if (!result) return null;
  let related: SampleProduct[] = [];
  if (result.product.categoryId) {
    const groups = await listStoreProducts(shopId, {
      categoryId: result.product.categoryId,
    });
    related = groups
      .flatMap((group) => group.products)
      .filter((product) => product.id !== result.product.id)
      .slice(0, 6);
  }
  return { ...result, related };
}
