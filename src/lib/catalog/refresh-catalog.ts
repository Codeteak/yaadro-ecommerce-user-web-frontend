"use server";

import { updateTag } from "next/cache";
import { catalogCacheTag } from "@/lib/db/shop-id";
import { getRequestShopId } from "@/lib/request-shop";

/** Drop the cached shop catalog so the next render reads the new prices. */
export async function refreshStorefrontCatalog() {
  try {
    const shopId = await getRequestShopId();
    updateTag(catalogCacheTag(shopId));
  } catch {
    // Still clear the legacy tag if shop resolve fails.
  }
  updateTag("storefront-catalog");
}
