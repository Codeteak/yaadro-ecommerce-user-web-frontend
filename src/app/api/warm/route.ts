import { connection, NextResponse } from "next/server";
import {
  listHomeShelves,
  listStoreCategories,
  listStoreProducts,
} from "@/lib/api/storefront";
import { defaultShopId, isShopUuid } from "@/lib/db/shop-id";

/**
 * Keeps catalog `"use cache"` warm so shoppers avoid the cold /home path.
 * Uses the default shop id (no Host header on health probes).
 * Docker/ALB can hit this on an interval.
 *
 * `connection()` opts into request time (Cache Components — no `dynamic` export).
 */
export async function GET() {
  await connection();

  const raw = defaultShopId();
  if (!isShopUuid(raw)) {
    return NextResponse.json(
      { ok: false, error: "shop_id_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await Promise.all([
      listStoreCategories(raw),
      listStoreProducts(raw, { maxPages: 1, pageSize: 24 }),
      listHomeShelves(raw),
    ]);
    return NextResponse.json(
      { ok: true, warmed: true, shopId: raw, ts: Date.now() },
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
