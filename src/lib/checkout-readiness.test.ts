import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCheckoutReadiness } from "./checkout-readiness.ts";

const readyBase = {
  signedIn: true,
  hasLocation: true,
  hasDetails: true,
  lineCount: 2,
  liveShopPricing: true,
  quoteLoading: false,
  quoteMatchesBasket: true,
  minimumMessage: null,
  checkoutWarning: null,
  couponRejectedMessage: null,
  pending: false,
};

test("ready shopper can place", () => {
  const result = evaluateCheckoutReadiness(readyBase);
  assert.equal(result.canPlace, true);
  assert.equal(result.buttonLabel, "Place Order");
  assert.equal(result.blockReason, null);
});

test("blocks while prices are loading", () => {
  const result = evaluateCheckoutReadiness({
    ...readyBase,
    quoteLoading: true,
  });
  assert.equal(result.canPlace, false);
  assert.equal(result.blockReason, "pricing");
  assert.match(result.buttonLabel, /Checking prices/i);
});

test("blocks on minimum and coupon rejection", () => {
  assert.equal(
    evaluateCheckoutReadiness({
      ...readyBase,
      minimumMessage: "Add ₹50 more",
    }).blockReason,
    "minimum",
  );
  assert.equal(
    evaluateCheckoutReadiness({
      ...readyBase,
      couponRejectedMessage: "Coupon expired",
    }).blockReason,
    "coupon",
  );
});

test("guest may tap to sign in", () => {
  const result = evaluateCheckoutReadiness({
    ...readyBase,
    signedIn: false,
  });
  assert.equal(result.canPlace, true);
  assert.equal(result.blockReason, "guest");
});

test("playground without live quote skips pricing gate", () => {
  const result = evaluateCheckoutReadiness({
    ...readyBase,
    liveShopPricing: false,
    quoteLoading: true,
    quoteMatchesBasket: false,
  });
  assert.equal(result.canPlace, true);
  assert.equal(result.blockReason, null);
});
