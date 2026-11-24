"use server";

import { mapCatalogProduct } from "@/lib/catalog-map";
import { readAllCategories, readProductPage } from "@/lib/db/catalog";
import { getRequestShopId } from "@/lib/request-shop";
import type { SampleProduct } from "@/lib/sample-products";

/** Home rail peek — enough cards for 1–2 rows, not a full PLP dump. */
const AISLE_PAGE_SIZE = 24;

/**
 * Load products for one home-rail aisle (root or any slug).
 * Used when the light home sample has no items for that category.
 * Scoped query includes descendants (same as PLP).
 *
 * Returns [] only for unknown slug / truly empty aisle.
 * DB failures throw so the client can show retry (not a fake empty aisle).
 */
export async function loadHomeAisleProducts(
  slug: string,
): Promise<SampleProduct[]> {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "all") return [];

  const shopId = await getRequestShopId();
  const categories = await readAllCategories(shopId);
  const category = categories.find(
    (row) => row.slug === trimmed && row.slug !== "all",
  );
  if (!category) return [];

  const page = await readProductPage(shopId, {
    categoryId: category.id,
    limit: AISLE_PAGE_SIZE,
  });

  return page.products
    .map((row) =>
      mapCatalogProduct({
        raw: {
          id: row.id,
          name: row.name,
          description: row.description,
          unit: row.unit,
          unit_size: row.unit_size,
          sold_by_weight: row.sold_by_weight,
          category_id: row.category_id,
          category_name: row.category_name,
          actual_price_minor: row.actual_price_minor,
          final_price_minor: row.final_price_minor,
          image: row.image,
          images: row.images,
        },
        categoryName: row.category_name ?? category.name,
        categoryId: row.category_id ?? category.id,
        categorySlug: row.category_slug ?? category.slug,
      }),
    )
    .filter((product): product is SampleProduct => Boolean(product))
    .map((product) => ({
      ...product,
      category: product.category || category.name,
      categoryId: product.categoryId ?? category.id,
      categorySlug: product.categorySlug ?? category.slug,
    }));
}
