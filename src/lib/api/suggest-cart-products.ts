"use server";

import { listStoreProducts } from "@/lib/api/storefront";
import {
  CATALOG_BROWSE_MAX_PAGES,
  CATALOG_BROWSE_PAGE_SIZE,
} from "@/lib/catalog-browse";
import { getRequestShopId } from "@/lib/request-shop";
import type { SampleProduct } from "@/lib/sample-products";

const MAX_CATEGORIES = 3;
const DEFAULT_LIMIT = 6;
/** Smaller page than hub browse — suggestions only need a few cards. */
const SUGGEST_PAGE_SIZE = Math.min(24, CATALOG_BROWSE_PAGE_SIZE);

/**
 * Live “you may also like” for the storefront cart.
 * Same categories as the basket come first. Remaining slots are other
 * shop products. Items already in the cart are left out.
 */
export async function suggestCartProducts(
  categoryIds: string[],
  excludeIds: string[],
  limit = DEFAULT_LIMIT,
): Promise<SampleProduct[]> {
  const categories = [
    ...new Set(categoryIds.map((id) => id.trim()).filter(Boolean)),
  ].slice(0, MAX_CATEGORIES);
  const exclude = new Set(excludeIds);
  const seen = new Set<string>();
  const picked: SampleProduct[] = [];

  const take = (products: SampleProduct[]) => {
    for (const product of products) {
      if (exclude.has(product.id) || seen.has(product.id)) continue;
      seen.add(product.id);
      picked.push(product);
      if (picked.length >= limit) return true;
    }
    return false;
  };

  try {
    const shopId = await getRequestShopId();
    if (categories.length > 0) {
      const groups = await Promise.all(
        categories.map((categoryId) =>
          listStoreProducts(shopId, {
            categoryId,
            maxPages: CATALOG_BROWSE_MAX_PAGES,
            pageSize: SUGGEST_PAGE_SIZE,
          }),
        ),
      );
      const sameCategory = groups.flatMap((group) =>
        group.flatMap((row) => row.products),
      );
      if (take(sameCategory)) return picked;
    }

    if (picked.length < limit) {
      const groups = await listStoreProducts(shopId, {
        maxPages: CATALOG_BROWSE_MAX_PAGES,
        pageSize: SUGGEST_PAGE_SIZE,
      });
      take(groups.flatMap((row) => row.products));
    }
  } catch {
    return picked;
  }

  return picked;
}
