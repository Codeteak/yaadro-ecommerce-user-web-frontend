import assert from "node:assert/strict";
import test from "node:test";
import {
  isOutsideDeliveryRadius,
  type DeliveryAddress,
} from "./delivery-address.ts";

const base: DeliveryAddress = {
  house: "",
  street: "Indiranagar",
  landmark: "",
  city: "Bengaluru",
  pin: "",
  lat: 12.97,
  lng: 77.64,
};

test("outside radius only when serviceable is explicitly false", () => {
  assert.equal(isOutsideDeliveryRadius(null), false);
  assert.equal(isOutsideDeliveryRadius(base), false);
  assert.equal(isOutsideDeliveryRadius({ ...base, serviceable: true }), false);
  assert.equal(isOutsideDeliveryRadius({ ...base, serviceable: false }), true);
});
