import assert from "node:assert/strict";
import test from "node:test";
import {
  addressSaveKey,
  runPlaceOrder,
  type PlaceOrderDeps,
} from "./place-order.ts";
import type { DeliveryAddress } from "./delivery-address.ts";

const address: DeliveryAddress = {
  house: "12 A",
  street: "Main",
  landmark: "",
  city: "Kochi",
  pin: "682001",
  lat: 10.1,
  lng: 76.2,
};

function deps(overrides: Partial<PlaceOrderDeps> = {}): PlaceOrderDeps {
  return {
    askLocation: async () => ({ lat: 10.1, lng: 76.2 }),
    checkDelivery: async () => ({
      serviceable: true,
      distanceM: 100,
      maxRadiusM: 5000,
    }),
    saveAddress: async () => undefined,
    placeOrder: async () => ({
      orderId: "ord-1",
      orderNumber: "YAD-1",
      subtotal_minor: 10000,
      promotion_discount_minor: 0,
      coupon_discount_minor: 0,
      delivery_fee_minor: 0,
      total_minor: 10000,
      coupon_code: null,
    }),
    lastOkPin: null,
    lastSavedAddressKey: null,
    ...overrides,
  };
}

test("addressSaveKey is stable for the same address and pin", () => {
  const key = addressSaveKey(address, { lat: 10.1, lng: 76.2 });
  assert.equal(key, addressSaveKey(address, { lat: 10.1, lng: 76.2 }));
  assert.notEqual(
    key,
    addressSaveKey({ ...address, house: "13" }, { lat: 10.1, lng: 76.2 }),
  );
});

test("skips delivery check and address save when unchanged", async () => {
  let checks = 0;
  let saves = 0;
  const key = addressSaveKey(address, { lat: 10.1, lng: 76.2 });
  const outcome = await runPlaceOrder(
    {
      address,
      items: [{ productId: "p1", quantity: 1 }],
      couponCode: null,
      idempotencyKey: "idem-1",
    },
    deps({
      lastOkPin: { lat: 10.1, lng: 76.2 },
      lastSavedAddressKey: key,
      checkDelivery: async () => {
        checks += 1;
        return { serviceable: true, distanceM: 1, maxRadiusM: 5000 };
      },
      saveAddress: async () => {
        saves += 1;
      },
    }),
  );
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.value.skippedDeliveryCheck, true);
    assert.equal(outcome.value.skippedAddressSave, true);
  }
  assert.equal(checks, 0);
  assert.equal(saves, 0);
});

test("blocks when delivery area check fails", async () => {
  const outcome = await runPlaceOrder(
    {
      address,
      items: [{ productId: "p1", quantity: 1 }],
      couponCode: null,
      idempotencyKey: "idem-1",
    },
    deps({
      checkDelivery: async () => ({
        serviceable: false,
        distanceM: 9000,
        maxRadiusM: 5000,
      }),
    }),
  );
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.failure.kind, "delivery");
  }
});
