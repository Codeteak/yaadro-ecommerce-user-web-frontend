/**
 * One delivery address: server is source of truth when signed in.
 * Maps GET /api/storefront/address → local delivery pin used by home/checkout.
 */

import { getMyAddress } from "@/lib/api/address";
import { hasCustomerSession } from "@/lib/api/session";
import {
  writeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";

function parseRawParts(raw: string | null | undefined): Partial<DeliveryAddress> {
  if (!raw?.trim()) return {};
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};
  return {
    house: parts[0] ?? "",
    street: parts.slice(1, -1).join(", ") || parts[1] || "",
    city: parts.length > 1 ? (parts[parts.length - 1] ?? "") : "",
  };
}

export function customerAddressToDelivery(address: {
  line1?: string | null;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  raw?: string | null;
}): DeliveryAddress {
  const fromRaw = parseRawParts(address.raw);
  const house = (address.line1 ?? fromRaw.house ?? "").trim();
  const street = (address.line2 ?? fromRaw.street ?? "").trim();
  const city = (address.city ?? fromRaw.city ?? "").trim();
  const lat =
    typeof address.lat === "number" && Number.isFinite(address.lat)
      ? address.lat
      : undefined;
  const lng =
    typeof address.lng === "number" && Number.isFinite(address.lng)
      ? address.lng
      : undefined;

  return {
    house: house || "Delivery address",
    street,
    landmark: (address.landmark ?? "").trim(),
    city,
    pin: "",
    ...(lat != null && lng != null ? { lat, lng } : {}),
  };
}

/** Pull the shopper's server address into Deliver-to when signed in. */
export async function syncServerDeliveryAddress(
  signal?: AbortSignal,
): Promise<DeliveryAddress | null> {
  if (!hasCustomerSession()) return null;
  try {
    const { address } = await getMyAddress(signal);
    if (!address) return null;
    const delivery = customerAddressToDelivery(address);
    writeDeliveryAddress(delivery);
    return delivery;
  } catch {
    return null;
  }
}
