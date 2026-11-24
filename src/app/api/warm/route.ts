import { connection, NextResponse } from "next/server";
import {
  listHomeShelves,
  listStoreCategories,
  listStoreProducts,
} from "@/lib/api/storefront";
import {
  CATALOG_BROWSE_MAX_PAGES,
  CATALOG_BROWSE_PAGE_SIZE,
} from "@/lib/catalog-browse";
import { defaultShopId, isShopUuid } from "@/lib/db/shop-id";

/**
 * Shop UUIDs to keep hot. Prefer `STOREFRONT_WARM_SHOP_IDS` (comma-separated)
 * or a single `STOREFRONT_WARM_SHOP_ID`. Falls back to the default/fallback
 * shop so local + single-shop deploys stay warm without extra env.
 *
 * Health probes have no Host header, so domain resolve cannot pick the shop —
 * set WARM_SHOP_ID(S) to the live shop UUID in multi-shop production.
 */
function warmShopIds(): string[] {
  const fromList =
    process.env.STOREFRONT_WARM_SHOP_IDS?.split(",")
      .map((value) => value.trim())
      .filter((value) => isShopUuid(value)) ?? [];
  if (fromList.length > 0) return [...new Set(fromList)];

  const single = process.env.STOREFRONT_WARM_SHOP_ID?.trim() ?? "";
  if (isShopUuid(single)) return [single];

  const fallback = defaultShopId();
  return isShopUuid(fallback) ? [fallback] : [];
}

async function warmShop(shopId: string): Promise<void> {
  await Promise.all([
    listStoreCategories(shopId),
    listStoreProducts(shopId, {
      maxPages: CATALOG_BROWSE_MAX_PAGES,
      pageSize: CATALOG_BROWSE_PAGE_SIZE,
    }),
    listHomeShelves(shopId),
  ]);
}

/**
 * Keeps catalog `"use cache"` warm so shoppers avoid the cold /home and
 * /categories path. Uses the same browse size as those pages.
 * Docker/ALB can hit this on an interval.
 *
 * `connection()` opts into request time (Cache Components — no `dynamic` export).
 */
export async function GET() {
  await connection();

  const shopIds = warmShopIds();
  if (shopIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "shop_id_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const warmed: string[] = [];
    const failed: { shopId: string; error: string }[] = [];
    for (const shopId of shopIds) {
      try {
        await warmShop(shopId);
        warmed.push(shopId);
      } catch (error) {
        failed.push({
          shopId,
          error: error instanceof Error ? error.message : "warm_failed",
        });
      }
    }

    if (warmed.length === 0) {
      return NextResponse.json(
        { ok: false, error: failed[0]?.error ?? "warm_failed", failed },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        warmed: true,
        shopIds: warmed,
        failed: failed.length > 0 ? failed : undefined,
        pageSize: CATALOG_BROWSE_PAGE_SIZE,
        ts: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "warm_failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
