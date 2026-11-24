/**
 * One error shape for every shop API call.
 * Copy lives here so screens can be translated later without parsing backend text.
 */

export type FieldErrors = Record<string, string[]>;

export type ApiErrorDetails = {
  fieldErrors?: FieldErrors;
  formErrors?: string[];
};

export type ApiErrorShape = {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetails;
  requestId?: string;
  retryAfterSec?: number;
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check the highlighted details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have access to do that.",
  404: "We couldn't find that.",
  408: "That took too long. Check your connection and try again.",
  409: "That already exists, or it changed. Refresh and try again.",
  410: "That action is no longer available.",
  422: "Please check the highlighted details and try again.",
  429: "You're going a bit fast. Wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "The shop is temporarily unavailable. Please try again shortly.",
  503: "The shop is temporarily unavailable. Please try again shortly.",
  504: "The shop is temporarily unavailable. Please try again shortly.",
};

/** Machine code → shopper copy. Backend sentences are preferred when they are already safe. */
const CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check the highlighted details and try again.",
  INVALID_INPUT: "Please check the highlighted details and try again.",
  MISSING_FIELD: "A required detail is missing.",
  INVALID_FORMAT: "That doesn't look quite right. Please check it and try again.",
  INVALID_JSON: "We couldn't read that request. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  INVALID_CREDENTIALS: "That code didn't match. Request a new one and try again.",
  FORBIDDEN: "You don't have access to do that.",
  INSUFFICIENT_PERMISSION: "You don't have access to do that.",
  NOT_FOUND: "We couldn't find that.",
  ALREADY_EXISTS: "That's already on your account.",
  CONFLICT: "That changed while you were checking out. Refresh and try again.",
  RATE_LIMITED: "You're going a bit fast. Wait a moment and try again.",
  TOO_MANY_REQUESTS: "You're going a bit fast. Wait a moment and try again.",
  SERVICE_UNAVAILABLE: "The shop is temporarily unavailable. Please try again shortly.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
  CART_EMPTY: "Your basket is empty.",
  CART_SERVER_RETIRED: "Your basket stays on this device. We'll price it when you check out.",
  EMPTY_CART_WITH_COUPON: "Remove the coupon or add items before placing the order.",
  SERVICE_AREA: "We don't deliver to that location yet.",
  ADDRESS_NOT_FOUND: "Add a delivery address before placing the order.",
  ADDRESS_REQUIRED: "Add a delivery address before placing the order.",
  ADDRESS_COORDINATES_REQUIRED:
    "We need your pin on the map before placing the order.",
  MIN_PURCHASE_NOT_MET: "Add a few more items to meet this shop's minimum order.",
  MIN_SUBTOTAL_NOT_MET: "Add a few more items to meet this shop's minimum order.",
  PRODUCT_UNAVAILABLE: "One or more items are no longer available. Update your cart.",
  PRODUCT_OUT_OF_STOCK: "One or more items don't have enough stock. Update your cart.",
  INVALID_QUANTITY: "A quantity in your cart isn't valid. Update your cart.",
  LINE_QUANTITY_CAP: "You've hit the maximum quantity for an item. Update your cart.",
  FIRST_ORDER_ONLY_NOT_MET: "That coupon is only for a first order.",
  NEW_CUSTOMER_ONLY_NOT_MET: "That coupon is only for new customers.",
  COUPON_NOT_FOUND: "We couldn't find that coupon.",
  COUPON_EXHAUSTED: "That coupon has been fully used.",
  COUPON_NOT_APPLICABLE: "That coupon can't be applied to this basket.",
  COUPON_NO_CART_BENEFIT: "That coupon doesn't change this basket's total.",
  COUPON_NOT_WITH_BUNDLE: "That coupon can't be combined with a free-item offer.",
  COUPON_NOT_AFTER_AUTO: "That coupon can't be combined with the shop's automatic offer.",
  COUPON_NOT_WITH_SKU: "That coupon doesn't apply to the items in your basket.",
  COUPON_NOT_WITH_AUTO_CART: "That coupon can't be combined with the shop's cart offer.",
  COUPON_NO_MATCHING_ITEMS: "That coupon doesn't match any items in your basket.",
  COUPON_RULE_SUBTOTAL_NOT_MET: "Add a few more items before that coupon can apply.",
  NETWORK: "You appear to be offline. Check your connection and try again.",
  TIMEOUT: "That took too long. Check your connection and try again.",
};

const STATUS_PHRASES = new Set([
  "bad request",
  "unauthorized",
  "forbidden",
  "not found",
  "conflict",
  "gone",
  "payload too large",
  "unprocessable entity",
  "too many requests",
  "internal server error",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  "error",
  "unknown error",
]);

export function messageForStatus(status: number): string {
  return STATUS_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

export function messageForCode(code: string, status: number): string {
  return CODE_MESSAGES[code] ?? messageForStatus(status);
}

/** True when a human wrote the sentence and it does not leak internals. */
export function isHumanReadableMessage(message: unknown): message is string {
  if (typeof message !== "string") return false;
  const trimmed = message.trim();
  if (!trimmed || !/\s/.test(trimmed)) return false;
  if (/^[A-Z0-9_]+$/.test(trimmed)) return false;
  if (STATUS_PHRASES.has(trimmed.toLowerCase().replace(/[.!]+$/, ""))) return false;
  if (/\bat\s+\w+\s+\(/.test(trimmed)) return false;
  if (/(select|insert|update|delete)\s+.*\s+from\s+/i.test(trimmed)) return false;
  if (/duplicate key value|violates .* constraint|relation ".*" does not exist/i.test(trimmed)) {
    return false;
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(trimmed)) return false;
  if (/password|refreshToken|accessToken|otp/i.test(trimmed) && trimmed.length > 180) return false;
  return true;
}

export function friendlyMessage(
  status: number,
  code: string,
  candidates: unknown[],
): string {
  for (const candidate of candidates) {
    if (isHumanReadableMessage(candidate)) return candidate.trim();
  }
  return messageForCode(code, status);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeDetails(details: unknown): ApiErrorDetails | undefined {
  const record = asRecord(details);
  if (!record) return undefined;
  const source = asRecord(record.issues) ?? record;
  const fieldErrors = asRecord(source.fieldErrors);
  const formErrors = Array.isArray(source.formErrors)
    ? source.formErrors.filter((item): item is string => typeof item === "string")
    : [];
  if (!fieldErrors && formErrors.length === 0) return undefined;
  const normalized: FieldErrors = {};
  if (fieldErrors) {
    for (const [key, value] of Object.entries(fieldErrors)) {
      if (Array.isArray(value)) {
        normalized[key] = value.filter((item): item is string => typeof item === "string");
      } else if (typeof value === "string") {
        normalized[key] = [value];
      }
    }
  }
  return { fieldErrors: normalized, formErrors };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;
  readonly requestId?: string;
  readonly retryAfterSec?: number;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.status = shape.status;
    this.code = shape.code;
    this.details = shape.details;
    this.requestId = shape.requestId;
    this.retryAfterSec = shape.retryAfterSec;
  }

  toJSON(): ApiErrorShape {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      retryAfterSec: this.retryAfterSec,
    };
  }
}

/** Login screens already catch this name. */
export class AuthApiError extends ApiError {
  constructor(message: string, status = 400, code = "UNAUTHORIZED") {
    super({ status, code, message });
    this.name = "AuthApiError";
  }
}

export function firstFieldError(error: ApiError): string | null {
  const fields = error.details?.fieldErrors;
  if (!fields) return error.details?.formErrors?.[0] ?? null;
  for (const messages of Object.values(fields)) {
    if (messages[0]) return messages[0];
  }
  return error.details?.formErrors?.[0] ?? null;
}

const SENSITIVE_QUERY = /^(token|access_token|refresh_token|code|otp|password|phone|authorization)$/i;

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://shop.local");
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY.test(key)) parsed.searchParams.set(key, "[redacted]");
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(header);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export function shouldRetry(input: {
  method: string;
  status: number | null;
  attempt: number;
  maxAttempts: number;
  idempotent: boolean;
}): boolean {
  if (input.attempt >= input.maxAttempts) return false;
  const method = input.method.toUpperCase();
  const safeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (!safeMethod && !input.idempotent) return false;
  if (input.status == null) return true;
  if (input.status === 408 || input.status === 429) return true;
  return input.status >= 500;
}

export function backoffMs(attempt: number, retryAfterSec?: number): number {
  if (retryAfterSec != null) return Math.min(retryAfterSec * 1000, 30_000);
  return Math.min(400 * 2 ** attempt, 8_000);
}
