import "server-only";

import { haversineMeters } from "@/lib/db/haversine";
import { SHOP_HUB_SQL } from "@/lib/db/catalog-query";
import { withShop } from "@/lib/db/pool";
import { requireShopId } from "@/lib/db/shop-id";
import type { ShopDeliveryHub } from "@/lib/delivery-radius-map";

export type { ShopDeliveryHub };

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

async function loadShopHubRow(shopId: string) {
  return withShop(shopId, async (client) => {
    const { rows } = await client.query<{
      status: string | null;
      service_area_radius_meters: number | string | null;
      hub_lat: number | string | null;
      hub_lng: number | string | null;
    }>(SHOP_HUB_SQL, [shopId]);
    return rows[0] ?? null;
  });
}

/**
 * Hub pin + service radius for the address map circle.
 * Lat/lng from the shop address row; radius from shops.service_area_radius_meters only.
 * Null when the shop is inactive or hub/radius are missing in DB (no env inventing).
 */
export async function readShopDeliveryHub(
  shopId = requireShopId(),
): Promise<ShopDeliveryHub | null> {
  const row = await loadShopHubRow(shopId);
  if (!row || String(row.status ?? "").trim().toLowerCase() !== "active") {
    return null;
  }
  const lat = finite(row.hub_lat);
  const lng = finite(row.hub_lng);
  if (lat == null || lng == null) return null;
  const shopRadius = finite(row.service_area_radius_meters);
  if (shopRadius == null || shopRadius <= 0) return null;
  return { lat, lng, radiusM: Math.round(shopRadius) };
}

/**
 * Same hub read and haversine test as the shop API.
 * Does not sign the delivery cookie. Place Order still calls the API for that.
 */
export async function readDeliveryArea(
  lat: number,
  lng: number,
  shopId = requireShopId(),
): Promise<DeliveryArea> {
  const reqLat = finite(lat);
  const reqLng = finite(lng);
  if (
    reqLat == null ||
    reqLng == null ||
    reqLat < -90 ||
    reqLat > 90 ||
    reqLng < -180 ||
    reqLng > 180
  ) {
    return { serviceable: false, distanceM: null, maxRadiusM: null };
  }

  const hub = await readShopDeliveryHub(shopId);
  if (!hub) {
    return { serviceable: false, distanceM: null, maxRadiusM: null };
  }

  const distanceM = Math.round(
    haversineMeters(reqLat, reqLng, hub.lat, hub.lng),
  );
  return {
    serviceable: distanceM <= hub.radiusM,
    distanceM,
    maxRadiusM: hub.radiusM,
  };
}
