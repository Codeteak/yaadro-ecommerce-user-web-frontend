"use server";

import { updateTag } from "next/cache";

/** Drop the cached shop catalog so the next render reads the new prices. */
export async function refreshStorefrontCatalog() {
  updateTag("storefront-catalog");
}
