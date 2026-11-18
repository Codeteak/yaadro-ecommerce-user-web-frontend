import assert from "node:assert/strict";
import test from "node:test";
import {
  isBasketCheckoutFailure,
  localCheckoutWarning,
  parseShopQuote,
  previewCheckoutWarning,
  shopCheckoutLines,
} from "./cart-checkout-rules.ts";

const MILK = "11111111-1111-4111-8111-111111111111";
const BREAD = "22222222-2222-4222-8222-222222222222";

test("ignores sample products and keeps shop lines", () => {
  const lines = shopCheckoutLines([
    { productId: "sample-milk", qty: 2 },
    { productId: MILK, qty: 1 },
    { productId: BREAD, qty: 0, weightKg: 0.5 },
  ]);
  assert.deepEqual(lines, [
    { productId: MILK, quantity: 1 },
    { productId: BREAD, quantity: 0.5 },
  ]);
});

test("blocks a line over the shop quantity cap", () => {
  assert.match(localCheckoutWarning([{ productId: MILK, quantity: 11 }]) ?? "", /10/);
  assert.equal(localCheckoutWarning([{ productId: MILK, quantity: 10 }]), null);
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

test("reads the minimum, a trusted zero total, and automatic offers", () => {
  const quote = parseShopQuote({
    summary: {
      min_purchase_minor: 100100,
      min_purchase_remaining_minor: 88100,
      subtotal_minor: 0,
    },
    promotions: {
      auto: {
        applied_offers: [
          { title: "10% off dairy", category_id: MILK, percent_bps: 1000 },
        ],
        suggested_offers: [{ category_name: "Bakery", percent_bps: 500 }],
      },
    },
  });
  assert.equal(
    quote.minimumMessage,
    "Add ₹881 more to meet this shop's ₹1,001 minimum order.",
  );
  assert.equal(quote.totalRupees, 0);
  assert.deepEqual(quote.applied, [
    { label: "10% off dairy", categoryId: MILK, reached: true },
  ]);
  assert.deepEqual(quote.suggested, [
    { label: "5% off Bakery", categoryId: null, reached: false },
  ]);
});

test("keeps the phone total when the shop omits a subtotal", () => {
  const quote = parseShopQuote({
    summary: { min_purchase_remaining_minor: 0, min_purchase_minor: 0 },
  });
  assert.equal(quote.minimumMessage, null);
  assert.equal(quote.totalRupees, null);
});

test("sends basket failures back to the cart and keeps address failures on checkout", () => {
  assert.equal(isBasketCheckoutFailure("MIN_PURCHASE_NOT_MET", "Add more."), true);
  assert.equal(
    isBasketCheckoutFailure("HTTP_400", "One or more products do not have enough stock."),
    true,
  );
  assert.equal(isBasketCheckoutFailure("ADDRESS_REQUIRED", "Delivery address is required"), false);
});
