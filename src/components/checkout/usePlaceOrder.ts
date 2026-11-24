"use client";

import { useCallback, useRef, useState } from "react";
import { checkDeliveryLocation, saveMyAddress } from "@/lib/api/address";
import { placeCheckoutOrder, type CheckoutResult } from "@/lib/api/checkout";
import {
  resolveCheckoutIdempotency,
  type CheckoutIdempotencySlot,
} from "@/lib/checkout-idempotency";
import {
  runPlaceOrder,
  type PlaceOrderPin,
  type PlaceOrderProgress,
} from "@/lib/place-order";
import type { DeliveryAddress } from "@/lib/delivery-address";
import { writeDeliveryAddress } from "@/lib/delivery-address";
import {
  askUntilLocation,
  readBrowserPosition,
} from "@/lib/delivery-location";
import type { CheckoutLine } from "@/lib/cart-checkout-rules";

export type PlaceOrderPendingLabel =
  | "Asking for your location…"
  | "Checking delivery…"
  | "Saving address…"
  | "Placing order…";

const PROGRESS_LABEL: Record<PlaceOrderProgress, PlaceOrderPendingLabel> = {
  locating: "Asking for your location…",
  checking_delivery: "Checking delivery…",
  saving_address: "Saving address…",
  placing: "Placing order…",
};

export type UsePlaceOrderResult = {
  pending: boolean;
  pendingLabel: PlaceOrderPendingLabel;
  place: (input: {
    address: DeliveryAddress;
    items: CheckoutLine[];
    couponCode: string | null;
    basketKey: string;
  }) => Promise<
    | { ok: true; order: CheckoutResult }
    | {
        ok: false;
        failure:
          | { kind: "location" }
          | { kind: "delivery"; message: string }
          | { kind: "thrown"; error: unknown };
      }
  >;
  clearIdempotency: () => void;
};

/**
 * Client hook around `runPlaceOrder` with basket-scoped idempotency
 * and caches for last ok pin / saved address.
 */
export function usePlaceOrder(): UsePlaceOrderResult {
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] =
    useState<PlaceOrderPendingLabel>("Placing order…");
  const idempotencyRef = useRef<CheckoutIdempotencySlot | null>(null);
  const lastOkPinRef = useRef<PlaceOrderPin | null>(null);
  const lastSavedAddressKeyRef = useRef<string | null>(null);

  const clearIdempotency = useCallback(() => {
    idempotencyRef.current = null;
  }, []);

  const place = useCallback(
    async (input: {
      address: DeliveryAddress;
      items: CheckoutLine[];
      couponCode: string | null;
      basketKey: string;
    }) => {
      const slot = resolveCheckoutIdempotency(
        idempotencyRef.current,
        input.basketKey,
      );
      idempotencyRef.current = slot;
      setPending(true);
      setPendingLabel("Checking delivery…");
      try {
        const outcome = await runPlaceOrder(
          {
            address: input.address,
            items: input.items,
            couponCode: input.couponCode,
            idempotencyKey: slot.key,
          },
          {
            lastOkPin: lastOkPinRef.current,
            lastSavedAddressKey: lastSavedAddressKeyRef.current,
            onProgress: (step) => setPendingLabel(PROGRESS_LABEL[step]),
            onPinResolved: (pin) => {
              if (!input.address.lat || !input.address.lng) {
                writeDeliveryAddress({ ...input.address, ...pin });
              }
            },
            askLocation: () => askUntilLocation(readBrowserPosition, 3),
            checkDelivery: (lat, lng) => checkDeliveryLocation(lat, lng),
            saveAddress: (body) => saveMyAddress(body),
            placeOrder: (payload) =>
              placeCheckoutOrder({
                items: payload.items,
                couponCode: payload.couponCode,
                idempotencyKey: payload.idempotencyKey,
              }),
          },
        );

        if (!outcome.ok) {
          return { ok: false as const, failure: outcome.failure };
        }

        lastOkPinRef.current = outcome.value.pin;
        lastSavedAddressKeyRef.current = outcome.value.addressKey;
        idempotencyRef.current = null;
        return { ok: true as const, order: outcome.value.order };
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { pending, pendingLabel, place, clearIdempotency };
}
