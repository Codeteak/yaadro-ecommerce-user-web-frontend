"use server";

import { refresh, updateTag } from "next/cache";
import { catalogCacheTag } from "@/lib/db/shop-id";
import { getRequestShopId } from "@/lib/request-shop";

/** Drop the cached shop catalog and refresh the current route. */
export async function refreshStorefrontCatalog() {
  try {
    const shopId = await getRequestShopId();
    updateTag(catalogCacheTag(shopId));
  } catch {
    // Still refresh the route if shop resolve fails.
  }
  // Legacy tag from single-shop builds.
  updateTag("storefront-catalog");
  refresh();
}
