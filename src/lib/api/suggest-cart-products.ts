"use server";

import { listStoreProducts } from "@/lib/api/storefront";
import type { SampleProduct } from "@/lib/sample-products";

const MAX_CATEGORIES = 6;
const DEFAULT_LIMIT = 6;

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
    if (categories.length > 0) {
      const groups = await Promise.all(
        categories.map((categoryId) => listStoreProducts({ categoryId })),
      );
      const sameCategory = groups.flatMap((group) =>
        group.flatMap((row) => row.products),
      );
      if (take(sameCategory)) return picked;
    }

    if (picked.length < limit) {
      const groups = await listStoreProducts();
      take(groups.flatMap((row) => row.products));
    }
  } catch {
    return picked;
  }

  return picked;
}
