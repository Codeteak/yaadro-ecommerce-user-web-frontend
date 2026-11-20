import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import {
  isLocalShopHost,
  resolveShopByDomain,
} from "@/lib/api/storefront";
import { defaultShopId, isShopUuid, requireShopId } from "@/lib/db/shop-id";

function hostFromHeaders(headerList: Headers): string {
  const raw =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

/**
 * Shop UUID for this request: domain resolve in production hosts, else the
 * default/fallback env id (local + unresolved domains).
 */
export const getRequestShopId = cache(async function getRequestShopId(): Promise<string> {
  const fallback = defaultShopId();
  let domain = "";
  try {
    domain = hostFromHeaders(await headers());
  } catch {
    // Headers unavailable during some prerenders — use default.
  }

  if (domain && !isLocalShopHost(domain)) {
    try {
      const resolved = await resolveShopByDomain(domain);
      if (resolved?.id && isShopUuid(resolved.id)) return resolved.id;
    } catch {
      // Fall through to default.
    }
  }

  return requireShopId(fallback);
});
