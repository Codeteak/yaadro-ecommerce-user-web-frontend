/** Extract storefront `error.code` from a thrown apiFetch / apiFetchRoot error. */
export function getApiErrorCode(err) {
  const code = err?.data?.error?.code ?? err?.data?.code ?? err?.code;
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
  CART_EMPTY: 'Your cart is empty. Add items before placing an order.',
  CART_NOT_FOUND: 'Your cart could not be found. Please refresh and try again.',
  PRODUCT_UNAVAILABLE:
    'One product is no longer available, or the quantity you selected cannot be fulfilled. Please review your cart.',
  PRICE_CHANGED:
    'Prices or quantities have changed. Please review your cart and try again.',
  ADDRESS_REQUIRED: 'Please add a delivery address before continuing.',
  ADDRESS_COORDINATES_REQUIRED:
    'Please select a delivery location on the map for your address.',
  ADDRESS_COORDINATES_INVALID:
    'Your delivery address map pin is invalid. Please update the pin on the map and try again.',
  ADDRESS_NOT_SERVICEABLE:
    "This address is outside this shop's delivery area. Choose another address or move the map pin.",
  ADDRESS_NOT_FOUND:
    "We couldn't find this delivery address. Please select or add another address.",
  LOCATION_NOT_VERIFIED:
    'Your delivery location could not be verified. Update the map pin on your address and try again.',
  SERVICE_AREA:
    "This address is outside this shop's delivery area, or your location was not verified. Update the map pin and try again.",
  SHOP_LOCATION_MISSING:
    'This shop is not ready to take delivery orders yet. Please try again later.',
  SHOP_BLOCKED: 'This shop is not available for orders right now.',
  SHOP_DELETED: 'This shop is not available for orders right now.',
  SHOP_UNAVAILABLE: 'This shop is not available for orders right now.',
  MISSING_SHOP_ID: 'Shop is not configured. Please refresh the page and try again.',
};

const ADDRESS_SAVE_HINTS = [
  {
    test: /line1|line_1|address line 1|building|street.*required|required.*street/i,
    message: 'Please enter Address Line 1.',
  },
  {
    test: /lat|lng|coordinate|map pin|location/i,
    message: 'Please select a delivery location on the map.',
  },
  {
    test: /phone|mobile/i,
    message: 'Please enter a valid mobile number.',
  },
  {
    test: /name|display.?name/i,
    message: 'Please enter your full name.',
  },
];

/** Network / offline / timeout — not a business validation failure. */
export function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (err.status === 0) return true;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('load failed') ||
    msg.includes('offline') ||
    (err.name === 'TypeError' && msg.includes('fetch'))
  );
}

/**
 * User-facing message for checkout / coupon failures.
 * Falls back to err.message from the API when no mapping exists.
 */
export function getCheckoutErrorMessage(err) {
  if (isNetworkError(err)) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (err?.status === 401) {
    return 'Your session expired. Please sign in again.';
  }
  if (err?.status === 404) {
    return 'We could not find what you need for checkout. Please refresh and try again.';
  }
  if (err?.status === 409) {
    const code = getApiErrorCode(err);
    if (code && CHECKOUT_ERROR_MESSAGES[code]) return CHECKOUT_ERROR_MESSAGES[code];
    return 'Your cart or order changed. Please review your cart and try again.';
  }
  if (err?.status >= 500) {
    return 'We could not complete this request right now. Please try again.';
  }

  const code = getApiErrorCode(err);
  if (code && CHECKOUT_ERROR_MESSAGES[code]) return CHECKOUT_ERROR_MESSAGES[code];
  const msg = err?.message;
  return typeof msg === 'string' && msg.trim()
    ? msg
    : 'Failed to place order. Please try again.';
}

/**
 * Map address create/update failures to a clear customer message.
 * Does not invent new validation rules — only interprets known API/network cases.
 */
export function getAddressSaveErrorMessage(err) {
  if (isNetworkError(err)) {
    return 'Unable to save your address right now. Please check your connection and try again.';
  }
  if (err?.status === 401) {
    return 'Your session expired. Please sign in again to save your address.';
  }
  if (err?.status === 404) {
    return "We couldn't find this delivery address. Please select or add another address.";
  }
  if (err?.status >= 500) {
    return "We couldn't save your address right now. Please try again.";
  }

  const code = getApiErrorCode(err);
  if (code === 'ADDRESS_REQUIRED' || code === 'VALIDATION_ERROR') {
    const raw = String(err?.message || '');
    for (const hint of ADDRESS_SAVE_HINTS) {
      if (hint.test.test(raw)) return hint.message;
    }
  }

  const raw = String(err?.message || '');
  for (const hint of ADDRESS_SAVE_HINTS) {
    if (hint.test.test(raw)) return hint.message;
  }

  if (raw.trim()) {
    // Avoid dumping raw Zod / schema jargon when we can soften it.
    if (/must not be null|required|invalid/i.test(raw) && /line1|line_1/i.test(raw)) {
      return 'Please enter Address Line 1.';
    }
    return raw;
  }

  return "We couldn't save your address. Please try again.";
}

/**
 * Classify a failed or non-serviceable delivery location check for UX.
 * @returns {{
 *   kind: 'serviceable' | 'not_serviceable' | 'network' | 'auth' | 'missing_shop' | 'missing_coords' | 'unknown',
 *   title: string,
 *   message: string,
 *   tone: 'error' | 'warning' | 'info'
 * }}
 */
export function classifyDeliveryCheckResult(result, err) {
  if (err) {
    const code = getApiErrorCode(err);
    if (code === 'MISSING_SHOP_ID' || /missing.*shop/i.test(String(err.message || ''))) {
      return {
        kind: 'missing_shop',
        title: 'Shop unavailable',
        message: 'Shop is not configured. Please refresh the page and try again.',
        tone: 'error',
      };
    }
    if (err.status === 401 || code === 'UNAUTHORIZED') {
      return {
        kind: 'auth',
        title: 'Sign in required',
        message: 'Your session expired. Please sign in again.',
        tone: 'warning',
      };
    }
    if (isNetworkError(err)) {
      return {
        kind: 'network',
        title: 'Connection problem',
        message:
          'Unable to check delivery availability. Please check your internet connection and try again.',
        tone: 'error',
      };
    }
    if (err.status >= 500) {
      return {
        kind: 'unknown',
        title: 'Could not verify delivery',
        message: 'We could not verify delivery for this address right now. Please try again.',
        tone: 'error',
      };
    }
    return {
      kind: 'unknown',
      title: 'Could not verify delivery',
      message:
        typeof err.message === 'string' && err.message.trim()
          ? err.message
          : 'We could not verify delivery for this address. Please try again.',
      tone: 'error',
    };
  }

  if (!result) {
    return {
      kind: 'missing_coords',
      title: 'Delivery location needed',
      message: 'Please select a delivery location on the map.',
      tone: 'warning',
    };
  }

  if (result.serviceable === true) {
    return {
      kind: 'serviceable',
      title: 'Delivery available',
      message: 'Your address is eligible for delivery.',
      tone: 'info',
    };
  }

  return {
    kind: 'not_serviceable',
    title: 'Outside delivery area',
    message:
      "This address is outside this shop's delivery area. Choose another address or move the map pin.",
    tone: 'warning',
  };
}

/** Short pin-check banner copy for the address map step. */
export function getPinDeliveryCheckMessage({ loading, error, serviceable }) {
  if (loading) return 'Checking delivery availability…';
  if (error) {
    const errObj =
      error instanceof Error
        ? error
        : typeof error === 'string'
          ? Object.assign(new Error(error), { message: error })
          : error;
    return classifyDeliveryCheckResult(null, errObj).message;
  }
  if (serviceable === true) return 'Delivery available at this spot';
  if (serviceable === false) {
    return "This address is outside this shop's delivery area. Move the pin inside the green zone.";
  }
  return 'Pan the map; we’ll check this spot automatically.';
}
