"use server";

import { readDeliveryArea, type DeliveryArea } from "@/lib/db/location";

/** Screen-only radius check. Place Order still calls the shop API. */
export async function previewDeliveryArea(lat: number, lng: number): Promise<DeliveryArea> {
  return readDeliveryArea(lat, lng);
}
