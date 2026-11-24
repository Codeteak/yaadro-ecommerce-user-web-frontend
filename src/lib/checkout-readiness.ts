/**
 * Pure Place Order gate — UI shows labels; this decides if the button may fire.
 */

export type CheckoutReadinessInput = {
  signedIn: boolean;
  hasLocation: boolean;
  hasDetails: boolean;
  lineCount: number;
  /** Live shop pricing is on (production checkout). */
  liveShopPricing: boolean;
  quoteLoading: boolean;
  quoteMatchesBasket: boolean;
  minimumMessage: string | null;
  checkoutWarning: string | null;
  couponRejectedMessage: string | null;
  pending: boolean;
};

export type CheckoutReadiness = {
  canPlace: boolean;
  buttonLabel: string;
  /** Short status under the button; null when ready and quiet. */
  statusMessage: string | null;
  blockReason:
    | "guest"
    | "empty"
    | "address"
    | "details"
    | "pricing"
    | "minimum"
    | "warning"
    | "coupon"
    | "pending"
    | null;
};

/**
 * Evaluate whether Place Order should be enabled and what copy to show.
 */
export function evaluateCheckoutReadiness(
  input: CheckoutReadinessInput,
): CheckoutReadiness {
  if (input.pending) {
    return {
      canPlace: false,
      buttonLabel: "Placing order…",
      statusMessage: null,
      blockReason: "pending",
    };
  }
  if (!input.signedIn) {
    return {
      canPlace: true,
      buttonLabel: "Sign in to place order",
      statusMessage: "Sign in so we can send this order to the shop.",
      blockReason: "guest",
    };
  }
  if (input.lineCount === 0) {
    return {
      canPlace: false,
      buttonLabel: "Add items to place order",
      statusMessage: "Your basket is empty — add items from the cart.",
      blockReason: "empty",
    };
  }
  if (!input.hasLocation) {
    return {
      canPlace: false,
      buttonLabel: "Add address to place order",
      statusMessage: "Add a delivery address, then Place Order unlocks.",
      blockReason: "address",
    };
  }
  if (!input.hasDetails) {
    return {
      canPlace: false,
      buttonLabel: "Add details to place order",
      statusMessage:
        "Location saved — add house / street details, then place the order.",
      blockReason: "details",
    };
  }
  if (input.liveShopPricing && (input.quoteLoading || !input.quoteMatchesBasket)) {
    return {
      canPlace: false,
      buttonLabel: "Checking prices…",
      statusMessage: "Checking prices with the shop…",
      blockReason: "pricing",
    };
  }
  if (input.couponRejectedMessage) {
    return {
      canPlace: false,
      buttonLabel: "Fix coupon to place order",
      statusMessage: input.couponRejectedMessage,
      blockReason: "coupon",
    };
  }
  if (input.checkoutWarning) {
    return {
      canPlace: false,
      buttonLabel: "Fix basket to place order",
      statusMessage: input.checkoutWarning,
      blockReason: "warning",
    };
  }
  if (input.minimumMessage) {
    return {
      canPlace: false,
      buttonLabel: "Add more to place order",
      statusMessage: input.minimumMessage,
      blockReason: "minimum",
    };
  }
  return {
    canPlace: true,
    buttonLabel: "Place Order",
    statusMessage: "Cash on delivery — pay when your order arrives.",
    blockReason: null,
  };
}
