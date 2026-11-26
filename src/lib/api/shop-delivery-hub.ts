"use server";

import { readShopDeliveryHub } from "@/lib/db/location";
import type { ShopDeliveryHub } from "@/lib/delivery-radius-map";
import { getRequestShopId } from "@/lib/request-shop";

export type { ShopDeliveryHub };

/** Shop hub + radius for the live address map circle. */
export async function getShopDeliveryHub(): Promise<ShopDeliveryHub | null> {
  const shopId = await getRequestShopId();
  return readShopDeliveryHub(shopId);
}
