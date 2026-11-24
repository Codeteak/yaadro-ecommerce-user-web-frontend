import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveCheckoutIdempotency,
  shouldClearCheckoutIdempotency,
} from "./checkout-idempotency.ts";

test("reuses the key while the basket key is unchanged", () => {
  const first = resolveCheckoutIdempotency(null, "a|1|SAVE", () => "key-1");
  const second = resolveCheckoutIdempotency(first, "a|1|SAVE", () => "key-2");
  assert.equal(second.key, "key-1");
  assert.equal(second.basketKey, "a|1|SAVE");
});

test("mints a new key when the basket or coupon changes", () => {
  const first = resolveCheckoutIdempotency(null, "a|1|", () => "key-1");
  const second = resolveCheckoutIdempotency(first, "a|2|", () => "key-2");
  assert.equal(second.key, "key-2");
  assert.equal(second.basketKey, "a|2|");
});

test("clears idempotency on definitive 4xx except 429", () => {
  assert.equal(shouldClearCheckoutIdempotency(400), true);
  assert.equal(shouldClearCheckoutIdempotency(401), true);
  assert.equal(shouldClearCheckoutIdempotency(429), false);
  assert.equal(shouldClearCheckoutIdempotency(500), false);
  assert.equal(shouldClearCheckoutIdempotency(null), false);
});
