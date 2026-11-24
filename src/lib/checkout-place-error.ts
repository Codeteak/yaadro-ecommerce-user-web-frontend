/**
 * Maps place-order failures to shopper copy and a single UI action.
 */

import { ApiError } from "./api/errors.ts";
import { isBasketCheckoutFailure } from "./cart-checkout-rules.ts";

export type PlaceErrorTone = "error" | "warning";
export type PlaceErrorAction = "stay" | "cart" | "login" | "address";

export type PlaceErrorResult = {
  message: string;
  tone: PlaceErrorTone;
  action: PlaceErrorAction;
  /** Clear basket-scoped idempotency after definitive 4xx (not 429). */
  clearIdempotency: boolean;
  status: number | null;
  code: string | null;
};

const OFFLINE =
  "We couldn't place the order. Check your connection and try again.";

/**
 * Convert an unknown place-order failure into UI guidance.
 */
export function mapCheckoutPlaceError(error: unknown): PlaceErrorResult {
  if (!(error instanceof ApiError)) {
    return {
      message: OFFLINE,
      tone: "error",
      action: "stay",
      clearIdempotency: false,
      status: null,
      code: null,
    };
  }

  const message = error.message?.trim() || OFFLINE;
  const code = error.code || null;
  const status = error.status;
  const clearIdempotency =
    status !== 429 && status >= 400 && status < 500;

  if (status === 401 || code === "UNAUTHORIZED" || code === "SESSION_EXPIRED") {
    return {
      message,
      tone: "warning",
      action: "login",
      clearIdempotency: true,
      status,
      code,
    };
  }

  if (
    code === "ADDRESS_REQUIRED" ||
    code === "ADDRESS_COORDINATES_REQUIRED" ||
    code === "ADDRESS_NOT_FOUND"
  ) {
    return {
      message,
      tone: "warning",
      action: "address",
      clearIdempotency: true,
      status,
      code,
    };
  }

  if (isBasketCheckoutFailure(code ?? "", message)) {
    return {
      message,
      tone: "warning",
      action: "cart",
      clearIdempotency: true,
      status,
      code,
    };
  }

  return {
    message,
    tone: "error",
    action: "stay",
    clearIdempotency,
    status,
    code,
  };
}
