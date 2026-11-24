import assert from "node:assert/strict";
import test from "node:test";
import { buildCartBill } from "./cart-bill.ts";
import type { ShopQuote } from "./cart-checkout-rules.ts";

const baseQuote = (overrides: Partial<ShopQuote> = {}): ShopQuote => ({
  minimumMessage: null,
  totalRupees: 380,
  linePromoDiscountRupees: 0,
  bundleDiscountRupees: 0,
  autoCartDiscountRupees: 0,
  coupon: {
    code: "SAVE50",
    status: "applied",
    discountRupees: 50,
    reasonMessage: null,
  },
  applied: [
    {
      label: "10% off Fruits",
      categoryId: "cat-1",
      reached: true,
      discountRupees: 20,
    },
  ],
  suggested: [],
  lines: [],
  freeItems: [],
  ...overrides,
});

test("shop bill rows add up to toPay", () => {
  const bill = buildCartBill({
    itemCount: 4,
    mrpTotal: 520,
    subtotal: 450,
    localCoupon: null,
    quote: baseQuote(),
  });
  assert.equal(bill.toPay, 380);
  assert.equal(bill.coupon?.discountRupees, 50);
  assert.equal(bill.offers[0]?.discountRupees, 20);
  const sum =
    bill.mrpTotal -
    bill.productDiscount -
    bill.offers.reduce((s, o) => s + o.discountRupees, 0) -
    (bill.coupon?.discountRupees ?? 0);
  assert.equal(Math.round(sum * 100) / 100, bill.toPay);
  assert.equal(bill.saved, 140);
  assert.equal(bill.fromShop, true);
});

test("local fallback uses phone subtotal and coupon", () => {
  const bill = buildCartBill({
    itemCount: 2,
    mrpTotal: 200,
    subtotal: 180,
    localCoupon: { code: "FLAT10", discountRupees: 10 },
    quote: null,
  });
  assert.equal(bill.toPay, 170);
  assert.equal(bill.productDiscount, 20);
  assert.equal(bill.coupon?.code, "FLAT10");
  assert.equal(bill.fromShop, false);
});

test("auto discount folds into one offer when applied rows have no ₹", () => {
  const bill = buildCartBill({
    itemCount: 1,
    mrpTotal: 100,
    subtotal: 90,
    localCoupon: null,
    quote: baseQuote({
      totalRupees: 85,
      coupon: {
        code: null,
        status: "none",
        discountRupees: 0,
        reasonMessage: null,
      },
      applied: [
        {
          label: "Cart deal",
          categoryId: null,
          reached: true,
          discountRupees: 0,
        },
      ],
      autoCartDiscountRupees: 5,
      bundleDiscountRupees: 0,
    }),
  });
  assert.equal(bill.offers.length, 1);
  assert.equal(bill.offers[0]?.discountRupees, 5);
  assert.equal(bill.toPay, 85);
});
