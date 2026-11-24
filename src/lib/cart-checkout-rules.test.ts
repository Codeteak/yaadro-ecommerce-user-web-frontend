import assert from "node:assert/strict";
import test from "node:test";
import {
  billCouponLine,
  isBasketCheckoutFailure,
  localCheckoutWarning,
  parseShopQuote,
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
    { productId: BREAD, quantity: 0.5 },
  ]);
});

test("weight lines send kilograms not step counts", () => {
  assert.equal(shopLineQuantity(weightBread(3.1)), 3.1);
  assert.equal(shopLineQuantity(weightBread(0.1)), 0.1);
  assert.equal(shopLineQuantity(weightBread(0.75)), 0.75);
  assert.equal(shopLineQuantity({ productId: MILK, qty: 2 }), 2);
});

test("blocks a pack line over the shop quantity cap", () => {
  assert.match(
    localCheckoutWarning([{ productId: MILK, qty: 11 }]) ?? "",
    /10/,
  );
  assert.equal(localCheckoutWarning([{ productId: MILK, qty: 10 }]), null);
});

test("allows weight kilograms above the pack line quantity cap", () => {
  // 3.1 kg must not trip the pack qty-10 rule.
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
  assert.equal(quote.coupon.status, "none");
  assert.deepEqual(quote.applied, [
    {
      label: "10% off dairy",
      categoryId: MILK,
      reached: true,
      discountRupees: 0,
    },
  ]);
  assert.deepEqual(quote.suggested, [
    {
      label: "5% off Bakery",
      categoryId: null,
      reached: false,
      discountRupees: 0,
    },
  ]);
});

test("parses free bundle lines and offer discount amounts", () => {
  const quote = parseShopQuote({
    summary: {
      min_purchase_minor: 0,
      min_purchase_remaining_minor: 0,
      subtotal_minor: 20000,
      auto_cart_discount_minor: 0,
    },
    items: [
      {
        product_id: MILK,
        title: "Milk",
        quantity: 1,
        offer_quantity: 0,
        is_bundle_reward: false,
        pricing: {
          list_minor: "5000",
          final_minor: "4500",
          line_total_minor: "4500",
        },
      },
      {
        product_id: BREAD,
        title: "Free bread",
        quantity: 0,
        offer_quantity: 1,
        is_bundle_reward: true,
        pricing: {
          list_minor: "3000",
          final_minor: "0",
          line_total_minor: "0",
        },
      },
    ],
    promotions: {
      auto: {
        applied_offers: [
          {
            title: "10% off dairy",
            category_id: MILK,
            discount_minor: 500,
          },
        ],
      },
    },
  });
  assert.equal(quote.lines.length, 2);
  assert.equal(quote.freeItems.length, 1);
  assert.equal(quote.freeItems[0]?.title, "Free bread");
  assert.equal(quote.applied[0]?.discountRupees, 5);
});

test("reads an applied shop coupon for the bill row", () => {
  const quote = parseShopQuote({
    summary: {
      min_purchase_minor: 0,
      min_purchase_remaining_minor: 0,
      subtotal_minor: 45000,
      coupon_discount_minor: 5000,
    },
    promotions: {
      coupon: {
        code: "FRESH10",
        status: "applied",
        discount_minor: 5000,
        reason_message: null,
      },
    },
  });
  assert.equal(quote.coupon.status, "applied");
  assert.equal(quote.coupon.discountRupees, 50);
  assert.deepEqual(billCouponLine("shop", quote, null), {
    code: "FRESH10",
    discountRupees: 50,
  });
  assert.equal(
    billCouponLine(
      "shop",
      { ...quote, coupon: { ...quote.coupon, status: "not_applicable" } },
      { code: "FRESH10", discountRupees: 50 },
    ),
    null,
  );
  assert.deepEqual(
    billCouponLine("sample", null, { code: "FRESH10", discountRupees: 50 }),
    { code: "FRESH10", discountRupees: 50 },
  );
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
