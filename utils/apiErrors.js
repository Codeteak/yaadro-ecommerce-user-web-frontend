/** Extract storefront `error.code` from a thrown apiFetch / apiFetchRoot error. */
export function getApiErrorCode(err) {
  const code = err?.data?.error?.code ?? err?.data?.code;
  return typeof code === 'string' ? code : null;
}

const CHECKOUT_ERROR_MESSAGES = {
  EMPTY_CART_WITH_COUPON: 'Add items to your cart before applying a coupon.',
  COUPON_NOT_FOUND: 'This coupon code is not valid.',
  COUPON_NOT_APPLICABLE: 'This coupon cannot be used on this order.',
  COUPON_NO_CART_BENEFIT: 'This coupon does not apply a cart discount.',
  COUPON_EXHAUSTED: 'This coupon has reached its usage limit.',
  MIN_SUBTOTAL_NOT_MET: 'Your cart total is below the minimum for this coupon.',
  FIRST_ORDER_ONLY_NOT_MET: 'This coupon is only valid on your first order.',
  NEW_CUSTOMER_ONLY_NOT_MET: 'This coupon is only for new customers.',
  CART_EMPTY: 'Your cart is empty.',
  CART_NOT_FOUND: 'Your cart could not be found. Please refresh and try again.',
  PRODUCT_UNAVAILABLE: 'An item in your cart is no longer available.',
  PRICE_CHANGED: 'Prices have changed. Please review your cart and try again.',
  ADDRESS_REQUIRED: 'Please add a delivery address before checkout.',
  ADDRESS_COORDINATES_REQUIRED: 'Your delivery address needs a map pin. Please update the address.',
  ADDRESS_NOT_SERVICEABLE: 'Delivery is not available for this address.',
  LOCATION_NOT_VERIFIED:
    'Your delivery location could not be verified. Update the map pin on your address and try again.',
};

/**
 * User-facing message for checkout / coupon failures.
 * Falls back to err.message from the API when no mapping exists.
 */
export function getCheckoutErrorMessage(err) {
  const code = getApiErrorCode(err);
  if (code && CHECKOUT_ERROR_MESSAGES[code]) return CHECKOUT_ERROR_MESSAGES[code];
  const msg = err?.message;
  return typeof msg === 'string' && msg.trim() ? msg : 'Failed to place order. Please try again.';
}
