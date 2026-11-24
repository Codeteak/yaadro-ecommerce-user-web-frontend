/**
 * Place-order orchestration — location, area, address save, then checkout.
 * UI supplies deps; this module stays free of React.
 */

import type { CheckoutResult } from "./api/checkout.ts";
import type { LocationCheck } from "./api/address.ts";
import type { CustomerAddress } from "./api/profile.ts";
import type { DeliveryAddress } from "./delivery-address.ts";
import { deliveryAreaBlock, isLatLng } from "./delivery-location.ts";

export type PlaceOrderLine = {
  productId: string;
  quantity: number;
};

export type PlaceOrderPin = { lat: number; lng: number };

export type PlaceOrderProgress =
  | "locating"
  | "checking_delivery"
  | "saving_address"
  | "placing";

export type PlaceOrderDeps = {
  askLocation: () => Promise<PlaceOrderPin | null>;
  checkDelivery: (lat: number, lng: number) => Promise<LocationCheck>;
  saveAddress: (address: CustomerAddress) => Promise<void>;
  placeOrder: (input: {
    items: PlaceOrderLine[];
    couponCode: string | null;
    idempotencyKey: string;
  }) => Promise<CheckoutResult>;
  /** Last pin that passed the delivery-area check (skip if unchanged). */
  lastOkPin: PlaceOrderPin | null;
  /** Last address snapshot successfully saved to the shop. */
  lastSavedAddressKey: string | null;
  onProgress?: (step: PlaceOrderProgress) => void;
  onPinResolved?: (pin: PlaceOrderPin) => void;
};

export type PlaceOrderInput = {
  address: DeliveryAddress;
  items: PlaceOrderLine[];
  couponCode: string | null;
  idempotencyKey: string;
};

export type PlaceOrderSuccess = {
  order: CheckoutResult;
  pin: PlaceOrderPin;
  addressKey: string;
  skippedDeliveryCheck: boolean;
  skippedAddressSave: boolean;
};

export type PlaceOrderFailure =
  | { kind: "location" }
  | { kind: "delivery"; message: string }
  | { kind: "thrown"; error: unknown };

export type PlaceOrderOutcome =
  | { ok: true; value: PlaceOrderSuccess }
  | { ok: false; failure: PlaceOrderFailure };

/** Stable key so we skip saveMyAddress when nothing changed. */
export function addressSaveKey(
  address: DeliveryAddress,
  pin: PlaceOrderPin,
): string {
  return [
    address.house.trim(),
    address.street.trim(),
    address.landmark.trim(),
    address.city.trim(),
    pin.lat.toFixed(6),
    pin.lng.toFixed(6),
  ].join("|");
}

function samePin(a: PlaceOrderPin | null, b: PlaceOrderPin): boolean {
  if (!a) return false;
  return (
    Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6
  );
}

function formatFullAddress(a: DeliveryAddress): string {
  return [a.house, a.street, a.landmark, a.city, a.pin]
    .filter(Boolean)
    .join(", ");
}

/**
 * Run the place-order steps. Caller handles navigation and cart clear.
 */
export async function runPlaceOrder(
  input: PlaceOrderInput,
  deps: PlaceOrderDeps,
): Promise<PlaceOrderOutcome> {
  const { address, items, couponCode, idempotencyKey } = input;

  let pin: PlaceOrderPin;
  if (isLatLng(address)) {
    pin = { lat: address.lat, lng: address.lng };
  } else {
    deps.onProgress?.("locating");
    const located = await deps.askLocation();
    if (!located) {
      return { ok: false, failure: { kind: "location" } };
    }
    pin = located;
  }

  deps.onPinResolved?.(pin);

  let skippedDeliveryCheck = false;
  if (samePin(deps.lastOkPin, pin)) {
    skippedDeliveryCheck = true;
  } else {
    deps.onProgress?.("checking_delivery");
    try {
      const area = await deps.checkDelivery(pin.lat, pin.lng);
      const blocked = deliveryAreaBlock(area);
      if (blocked) {
        return { ok: false, failure: { kind: "delivery", message: blocked } };
      }
    } catch (error) {
      return { ok: false, failure: { kind: "thrown", error } };
    }
  }

  const nextAddressKey = addressSaveKey(address, pin);
  let skippedAddressSave = false;
  if (deps.lastSavedAddressKey === nextAddressKey) {
    skippedAddressSave = true;
  } else {
    deps.onProgress?.("saving_address");
    try {
      await deps.saveAddress({
        line1: address.house || address.street,
        line2: address.street || null,
        landmark: address.landmark || null,
        city: address.city || null,
        lat: pin.lat,
        lng: pin.lng,
        raw: formatFullAddress(address),
      });
    } catch (error) {
      return { ok: false, failure: { kind: "thrown", error } };
    }
  }

  deps.onProgress?.("placing");
  try {
    const order = await deps.placeOrder({
      items,
      couponCode,
      idempotencyKey,
    });
    return {
      ok: true,
      value: {
        order,
        pin,
        addressKey: nextAddressKey,
        skippedDeliveryCheck,
        skippedAddressSave,
      },
    };
  } catch (error) {
    return { ok: false, failure: { kind: "thrown", error } };
  }
}
