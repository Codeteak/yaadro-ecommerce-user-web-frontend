import assert from "node:assert/strict";
import test from "node:test";
import {
  friendlyMessage,
  isHumanReadableMessage,
  redactUrl,
  shouldRetry,
} from "./errors.ts";

test("uses a safe sentence from the shop when one exists", () => {
  assert.equal(
    friendlyMessage(400, "VALIDATION_ERROR", ["Please enter a 4-digit code."]),
    "Please enter a 4-digit code.",
  );
});

test("hides status phrases, codes, and driver text", () => {
  assert.equal(isHumanReadableMessage("not found"), false);
  assert.equal(isHumanReadableMessage("VALIDATION_ERROR"), false);
  assert.equal(
    friendlyMessage(500, "INTERNAL_ERROR", ["duplicate key value violates unique constraint"]),
    "Something went wrong on our side. Please try again.",
  );
});

test("retries network and 5xx on safe calls only", () => {
  assert.equal(
    shouldRetry({ method: "GET", status: 503, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "POST", status: 503, attempt: 1, maxAttempts: 3, idempotent: false }),
    false,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: 400, attempt: 1, maxAttempts: 3, idempotent: true }),
    false,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: null, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
});

test("strips secrets from logged urls", () => {
  assert.equal(
    redactUrl("https://shop.example/api/auth/otp/verify?code=1234&phone=999"),
    "/api/auth/otp/verify?code=%5Bredacted%5D&phone=%5Bredacted%5D",
  );
});
