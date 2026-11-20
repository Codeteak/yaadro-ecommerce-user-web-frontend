"use server";

import { readDeliveryArea, type DeliveryArea } from "@/lib/db/location";
import { getRequestShopId } from "@/lib/request-shop";

/** Screen-only radius check. Place Order still calls the shop API. */
export async function previewDeliveryArea(lat: number, lng: number): Promise<DeliveryArea> {
  const shopId = await getRequestShopId();
  return readDeliveryArea(lat, lng, shopId);
}
