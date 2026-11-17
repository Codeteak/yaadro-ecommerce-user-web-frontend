import "server-only";

import { haversineMeters } from "@/lib/db/haversine";
import { SHOP_HUB_SQL } from "@/lib/db/catalog-query";
import { withShop } from "@/lib/db/pool";
import { requireShopId } from "@/lib/db/shop-id";

export type DeliveryArea = {
  serviceable: boolean;
  distanceM: number | null;
  maxRadiusM: number | null;
};

function finite(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim().replace(",", "."))
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultRadiusM(): number {
  const raw = Number(process.env.SERVICE_AREA_RADIUS_METERS);
  return Number.isInteger(raw) && raw > 0 ? raw : 5000;
}

/**
 * Same hub read and haversine test as the shop API.
 * Does not sign the delivery cookie. Place Order still calls the API for that.
 */
export async function readDeliveryArea(lat: number, lng: number, shopId = requireShopId()): Promise<DeliveryArea> {
  const fallback = defaultRadiusM();
  const reqLat = finite(lat);
  const reqLng = finite(lng);
  if (reqLat == null || reqLng == null || reqLat < -90 || reqLat > 90 || reqLng < -180 || reqLng > 180) {
    return { serviceable: false, distanceM: null, maxRadiusM: fallback };
  }

  const row = await withShop(shopId, async (client) => {
    const { rows } = await client.query<{
      status: string | null;
      service_area_radius_meters: number | string | null;
      hub_lat: number | string | null;
      hub_lng: number | string | null;
    }>(SHOP_HUB_SQL, [shopId]);
    return rows[0] ?? null;
  });

  if (!row || String(row.status ?? "").trim().toLowerCase() !== "active") {
    return { serviceable: false, distanceM: null, maxRadiusM: fallback };
  }

  const hubLat = finite(row.hub_lat);
  const hubLng = finite(row.hub_lng);
  if (hubLat == null || hubLng == null) {
    return { serviceable: false, distanceM: null, maxRadiusM: fallback };
  }

  const shopRadius = finite(row.service_area_radius_meters);
  const maxRadiusM = shopRadius != null && shopRadius > 0 ? Math.round(shopRadius) : fallback;
  const distanceM = Math.round(haversineMeters(reqLat, reqLng, hubLat, hubLng));
  return {
    serviceable: distanceM <= maxRadiusM,
    distanceM,
    maxRadiusM,
  };
}
