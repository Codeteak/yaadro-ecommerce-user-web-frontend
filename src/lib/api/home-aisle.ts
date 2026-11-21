"use server";

import {
  listStoreCategories,
  listStoreProducts,
} from "@/lib/api/storefront";
import { getRequestShopId } from "@/lib/request-shop";
import type { SampleProduct } from "@/lib/sample-products";

/** Home rail peek — enough cards for 1–2 rows, not a full PLP dump. */
const AISLE_PAGE_SIZE = 24;

/**
 * Load products for one home-rail aisle (root or any slug).
 * Used when the light home sample has no items for that category.
 * Scoped query includes descendants (same as PLP).
 */
export async function loadHomeAisleProducts(
  slug: string,
): Promise<SampleProduct[]> {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "all") return [];

  try {
    const shopId = await getRequestShopId();
    const categories = await listStoreCategories(shopId);
    const category = categories.find(
      (row) => row.slug === trimmed && row.slug !== "all",
    );
    if (!category) return [];

    const groups = await listStoreProducts(shopId, {
      categoryId: category.id,
      maxPages: 1,
      pageSize: AISLE_PAGE_SIZE,
    });

    return groups.flatMap((group) =>
      group.products.map((product) => ({
        ...product,
        category: group.category?.name ?? category.name,
        categoryId: group.category?.id ?? category.id,
        categorySlug: group.category?.slug ?? category.slug,
      })),
    );
  } catch {
    return [];
  }
}
