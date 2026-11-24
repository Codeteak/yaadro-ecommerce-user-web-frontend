import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api/errors.ts";
import { mapCheckoutPlaceError } from "./checkout-place-error.ts";

test("maps offline failures to stay", () => {
  const result = mapCheckoutPlaceError(new Error("boom"));
  assert.equal(result.action, "stay");
  assert.equal(result.clearIdempotency, false);
  assert.match(result.message, /connection/i);
});

test("routes basket failures to cart", () => {
  const result = mapCheckoutPlaceError(
    new ApiError({
      status: 400,
      code: "MIN_PURCHASE_NOT_MET",
      message: "Add more to meet the minimum.",
    }),
  );
  assert.equal(result.action, "cart");
  assert.equal(result.tone, "warning");
  assert.equal(result.clearIdempotency, true);
});

test("routes auth to login and address codes to address", () => {
  assert.equal(
    mapCheckoutPlaceError(
      new ApiError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Please sign in again.",
      }),
    ).action,
    "login",
  );
  assert.equal(
    mapCheckoutPlaceError(
      new ApiError({
        status: 400,
        code: "ADDRESS_REQUIRED",
        message: "Delivery address is required",
      }),
    ).action,
    "address",
  );
});

test("keeps idempotency on 429", () => {
  const result = mapCheckoutPlaceError(
    new ApiError({
      status: 429,
      code: "RATE_LIMITED",
      message: "Slow down.",
    }),
  );
  assert.equal(result.clearIdempotency, false);
  assert.equal(result.action, "stay");
});
