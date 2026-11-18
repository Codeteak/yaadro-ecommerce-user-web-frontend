import assert from "node:assert/strict";
import test from "node:test";
import {
  isBasketCheckoutFailure,
  localCheckoutWarning,
  previewCheckoutWarning,
  shopCheckoutLines,
  shopLineQuantity,
} from "./cart-checkout-rules.ts";
import type { CartItem } from "./cart-lines.ts";

const MILK = "11111111-1111-4111-8111-111111111111";
const BREAD = "22222222-2222-4222-8222-222222222222";

const weightBread = (weightKg: number): CartItem => ({
  productId: BREAD,
  qty: 0,
  weightKg,
  snapshot: {
    name: "Bread",
    unit: "0.1 kg",
    price: 230,
    mrp: 250,
    image: "/products/no-image.jpg",
    category: "Bakery",
    customization: { type: "weight", stepKg: 0.1, minKg: 0.1, maxKg: 10 },
  },
});

test("ignores sample products and keeps shop lines", () => {
  const lines = shopCheckoutLines([
    { productId: "sample-milk", qty: 2 },
    { productId: MILK, qty: 1 },
    weightBread(0.5),
  ]);
  assert.deepEqual(lines, [
    { productId: MILK, quantity: 1 },
    // 0.5 kg ÷ 0.1 step = 5 units (price_minor_per_unit basis)
    { productId: BREAD, quantity: 5 },
  ]);
});

test("weight lines send unit count not raw kilograms", () => {
  assert.equal(shopLineQuantity(weightBread(3.1)), 31);
  assert.equal(shopLineQuantity(weightBread(0.1)), 1);
  assert.equal(shopLineQuantity({ productId: MILK, qty: 2 }), 2);
});

test("blocks a pack line over the shop quantity cap", () => {
  assert.match(
    localCheckoutWarning([{ productId: MILK, qty: 11 }]) ?? "",
    /10/,
  );
  assert.equal(localCheckoutWarning([{ productId: MILK, qty: 10 }]), null);
});

test("allows weight unit counts above the pack line cap", () => {
  // 3.1 kg → 31 units; must not trip the pack qty-10 rule.
  assert.equal(localCheckoutWarning([weightBread(3.1)]), null);
});

test("blocks a basket under the shop minimum and a rejected coupon", () => {
  const warning = previewCheckoutWarning(
    {
      items: [{ product_id: MILK }],
      summary: { min_purchase_minor: 100100, min_purchase_remaining_minor: 40200 },
      promotions: {
        coupon: {
          status: "not_applicable",
          reason_message: "This coupon needs an order of at least ₹499.",
        },
      },
    },
    [MILK],
  );
  assert.match(warning ?? "", /Add ₹402 more to meet this shop's ₹1,001 minimum order/);
  assert.match(warning ?? "", /at least ₹499/);
});

test("blocks a product the shop dropped from the preview", () => {
  const warning = previewCheckoutWarning(
    {
      items: [{ product_id: MILK }],
      summary: { min_purchase_minor: 0, min_purchase_remaining_minor: 0 },
      promotions: { coupon: { status: "none", reason_message: null } },
    },
    [MILK, BREAD],
  );
  assert.match(warning ?? "", /unavailable/);
});

test("lets a basket through when every rule passes", () => {
  assert.equal(
    previewCheckoutWarning(
      {
        items: [{ product_id: MILK }],
        summary: { min_purchase_minor: 100100, min_purchase_remaining_minor: 0 },
        promotions: { coupon: { status: "applied", reason_message: null } },
      },
      [MILK],
    ),
    null,
  );
});

test("sends basket failures back to the cart and keeps address failures on checkout", () => {
  assert.equal(isBasketCheckoutFailure("MIN_PURCHASE_NOT_MET", "Add more."), true);
  assert.equal(
    isBasketCheckoutFailure("HTTP_400", "One or more products do not have enough stock."),
    true,
  );
  assert.equal(isBasketCheckoutFailure("ADDRESS_REQUIRED", "Delivery address is required"), false);
});
