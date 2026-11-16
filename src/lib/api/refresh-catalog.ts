"use server";

import { refresh, updateTag } from "next/cache";

/** Drop the cached shop catalog and refresh the current route. */
export async function refreshStorefrontCatalog() {
  updateTag("storefront-catalog");
  refresh();
}
