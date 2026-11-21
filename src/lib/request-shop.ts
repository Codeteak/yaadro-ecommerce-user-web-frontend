import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import {
  isLocalShopHost,
  resolveShopByDomain,
  type ResolvedShop,
} from "@/lib/api/storefront";
import { defaultShopId, isShopUuid, requireShopId } from "@/lib/db/shop-id";

function hostFromHeaders(headerList: Headers): string {
  const raw =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

/**
 * One domain → shop resolve per request (React `cache`).
 * Home SEO, category rail, and catalog all reuse this.
 */
export const getResolvedRequestShop = cache(
  async function getResolvedRequestShop(): Promise<ResolvedShop | null> {
    let domain = "";
    try {
      domain = hostFromHeaders(await headers());
    } catch {
      return null;
    }

    if (!domain || isLocalShopHost(domain)) return null;

    try {
      return await resolveShopByDomain(domain);
    } catch {
      return null;
    }
  },
);

/**
 * Shop UUID for this request: domain resolve in production hosts, else the
 * default/fallback env id (local + unresolved domains).
 */
export const getRequestShopId = cache(async function getRequestShopId(): Promise<string> {
  const resolved = await getResolvedRequestShop();
  if (resolved?.id && isShopUuid(resolved.id)) return resolved.id;
  return requireShopId(defaultShopId());
});
