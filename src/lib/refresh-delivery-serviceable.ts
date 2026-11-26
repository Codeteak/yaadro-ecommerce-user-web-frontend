"use client";

import { previewDeliveryArea } from "@/lib/api/preview-delivery-area";
import {
  readDeliveryAddress,
  writeDeliveryAddress,
} from "@/lib/delivery-address";

/**
 * Runs the shop radius preview for the current Deliver-to pin and persists
 * `serviceable` so HomeTopBar can show Outside delivery radius.
 * Returns the boolean result, or null when the check could not run.
 */
export async function refreshDeliveryServiceable(
  lat: number,
  lng: number,
): Promise<boolean | null> {
  try {
    const area = await previewDeliveryArea(lat, lng);
    const current = readDeliveryAddress();
    if (!current) return null;
    if (current.lat !== lat || current.lng !== lng) return null;
    const serviceable = area.serviceable === true;
    writeDeliveryAddress({ ...current, serviceable });
    return serviceable;
  } catch {
    return null;
  }
}
