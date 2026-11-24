import assert from "node:assert/strict";
import test from "node:test";
import {
  backoffMs,
  firstFieldError,
  friendlyMessage,
  isHumanReadableMessage,
  messageForCode,
  normalizeDetails,
  parseRetryAfter,
  redactUrl,
  shouldRetry,
  ApiError,
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
  assert.equal(isHumanReadableMessage("not found."), false);
  assert.equal(isHumanReadableMessage(""), false);
  assert.equal(isHumanReadableMessage("a"), false);
  assert.equal(
    friendlyMessage(500, "INTERNAL_ERROR", ["duplicate key value violates unique constraint"]),
    "Something went wrong on our side. Please try again.",
  );
  assert.equal(
    friendlyMessage(500, "INTERNAL_ERROR", ["select * from orders where id = 1"]),
    "Something went wrong on our side. Please try again.",
  );
});

test("maps status and shop codes to shopper copy", () => {
  assert.match(messageForCode("SERVICE_AREA", 403), /don't deliver/i);
  assert.match(messageForCode("CART_SERVER_RETIRED", 410), /basket stays on this device/i);
  assert.match(messageForCode("RATE_LIMITED", 429), /bit fast/i);
  assert.match(messageForCode("MIN_PURCHASE_NOT_MET", 400), /minimum order/i);
  assert.match(messageForCode("COUPON_NOT_APPLICABLE", 400), /can't be applied/i);
  assert.match(messageForCode("ADDRESS_REQUIRED", 400), /delivery address/i);
  assert.match(friendlyMessage(404, "NOT_FOUND", ["not found"]), /couldn't find/i);
  assert.match(friendlyMessage(403, "FORBIDDEN", [null]), /don't have access/i);
  assert.match(friendlyMessage(422, "VALIDATION_ERROR", ["Please check the highlighted fields."]), /highlighted fields/i);
});

test("retries network, 408, 429, and 5xx on safe calls only", () => {
  assert.equal(
    shouldRetry({ method: "GET", status: 503, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "POST", status: 503, attempt: 1, maxAttempts: 3, idempotent: false }),
    false,
  );
  assert.equal(
    shouldRetry({ method: "POST", status: 503, attempt: 1, maxAttempts: 3, idempotent: true }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: 400, attempt: 1, maxAttempts: 3, idempotent: true }),
    false,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: 401, attempt: 1, maxAttempts: 3, idempotent: true }),
    false,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: 408, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "HEAD", status: 429, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: null, attempt: 1, maxAttempts: 3, idempotent: false }),
    true,
  );
  assert.equal(
    shouldRetry({ method: "GET", status: 503, attempt: 3, maxAttempts: 3, idempotent: true }),
    false,
  );
});

test("backs off with a cap and honors Retry-After", () => {
  assert.equal(backoffMs(0), 400);
  assert.equal(backoffMs(1), 800);
  assert.equal(backoffMs(10), 8_000);
  assert.equal(backoffMs(0, 2), 2_000);
  assert.equal(backoffMs(0, 120), 30_000);
  assert.equal(parseRetryAfter("4"), 4);
  assert.equal(parseRetryAfter("nope"), undefined);
  const soon = new Date(Date.now() + 5_000).toUTCString();
  const parsed = parseRetryAfter(soon);
  assert.equal(typeof parsed, "number");
  assert.ok((parsed ?? 0) >= 1 && (parsed ?? 0) <= 6);
});

test("reads the first field error and ignores empty details", () => {
  const error = new ApiError({
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Please check the highlighted details and try again.",
    details: normalizeDetails({
      fieldErrors: { phone: ["Invalid phone number"], code: "OTP code must be 4 digits" },
      formErrors: ["Provide at least one field to update"],
    }),
  });
  assert.equal(firstFieldError(error), "Invalid phone number");
  assert.equal(normalizeDetails(null), undefined);
  assert.equal(normalizeDetails(["nope"]), undefined);
  assert.deepEqual(error.toJSON().details?.formErrors, ["Provide at least one field to update"]);
});

test("strips secrets from logged urls", () => {
  assert.equal(
    redactUrl("https://shop.example/api/auth/otp/verify?code=1234&phone=999"),
    "/api/auth/otp/verify?code=%5Bredacted%5D&phone=%5Bredacted%5D",
  );
  assert.equal(
    redactUrl("https://shop.example/api/storefront/orders?limit=20"),
    "/api/storefront/orders?limit=20",
  );
  assert.equal(redactUrl("not a url"), "/not%20a%20url");
});

