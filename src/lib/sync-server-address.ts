/**
 * One delivery address: server is source of truth when signed in.
 * Maps GET /api/storefront/address → Deliver-to + the single local address book row.
 */

import { getMyAddress } from "@/lib/api/address";
import { hasCustomerSession } from "@/lib/api/session";
import {
  readDeliveryAddress,
  writeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";
import {
  getSelectedAddress,
  listSavedAddresses,
  upsertSavedAddress,
} from "@/lib/saved-addresses";

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

function applyServerAddressLocally(address: {
  line1?: string | null;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  raw?: string | null;
}): DeliveryAddress {
  const delivery = customerAddressToDelivery(address);
  const hasServerPin =
    typeof delivery.lat === "number" && typeof delivery.lng === "number";

  // Server rows sometimes omit coords — keep the last local / book pin so the
  // map and Deliver-to do not flicker empty after sync.
  const current = readDeliveryAddress();
  const book = getSelectedAddress() ?? listSavedAddresses()[0] ?? null;
  const localLat = hasServerPin
    ? delivery.lat
    : typeof current?.lat === "number"
      ? current.lat
      : typeof book?.lat === "number"
        ? book.lat
        : undefined;
  const localLng = hasServerPin
    ? delivery.lng
    : typeof current?.lng === "number"
      ? current.lng
      : typeof book?.lng === "number"
        ? book.lng
        : undefined;
  const samePin =
    typeof localLat === "number" &&
    typeof localLng === "number" &&
    current?.lat === localLat &&
    current?.lng === localLng;

  const merged: DeliveryAddress = {
    ...delivery,
    ...(typeof localLat === "number" && typeof localLng === "number"
      ? { lat: localLat, lng: localLng }
      : {}),
    ...(samePin && typeof current?.serviceable === "boolean"
      ? { serviceable: current.serviceable }
      : {}),
  };

  writeDeliveryAddress(merged);
  // Keep the address book row in sync so the sheet does not show a stale local pin.
  upsertSavedAddress({
    label: book?.label?.trim() || "Home",
    type: book?.type ?? "house",
    building: delivery.house || book?.building || "",
    street: delivery.street || book?.street || "",
    area: book?.area ?? "",
    city: delivery.city || book?.city || "",
    pin: delivery.pin || book?.pin || "",
    landmark: delivery.landmark || book?.landmark || "",
    instructions: book?.instructions ?? "",
    isDefault: true,
    lat: merged.lat,
    lng: merged.lng,
  });
  return merged;
}

/** Pull the shopper's server address into Deliver-to + address book when signed in. */
export async function syncServerDeliveryAddress(
  signal?: AbortSignal,
): Promise<DeliveryAddress | null> {
  if (!hasCustomerSession()) return null;
  try {
    const { address } = await getMyAddress(signal);
    if (!address) return null;
    return applyServerAddressLocally(address);
  } catch {
    return null;
  }
}
