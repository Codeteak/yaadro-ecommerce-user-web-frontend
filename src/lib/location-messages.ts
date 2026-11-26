/**
 * Canonical location / delivery-area copy for toasters (#26).
 * Used by checkout, address book, and playground `/playground/toasts`.
 */

export type LocationToastTone = "success" | "error" | "info" | "warning";

export type LocationToast = {
  message: string;
  tone: LocationToastTone;
};

/** Home Deliver-to line when the pin is outside the shop radius. */
export const DELIVERY_OUTSIDE_RADIUS_LABEL = "Outside delivery radius";

/** Null when the shop can deliver. Otherwise the sentence to show. */
export function deliveryAreaMessage(
  result: { serviceable?: boolean } | null,
): string | null {
  if (!result || result.serviceable !== true) {
    if (result && result.serviceable === false) {
      return LOCATION_TOASTS.notServiceable.message;
    }
    return LOCATION_TOASTS.checkFailed.message;
  }
  return null;
}

export const LOCATION_TOASTS = {
  deliveringHere: {
    message: "We deliver to this location.",
    tone: "success",
  },
  addressSaved: {
    message: "Delivery location saved.",
    tone: "success",
  },
  notServiceable: {
    message: "We don't deliver to that location yet.",
    tone: "error",
  },
  checkFailed: {
    message: "We couldn't check delivery for that location. Try again.",
    tone: "error",
  },
  allowLocation: {
    message:
      "Allow location so we can check if this shop delivers to you, then try again.",
    tone: "warning",
  },
  needAddress: {
    message: "Add a delivery address first.",
    tone: "warning",
  },
  needAddressDetails: {
    message: "Add your address details to place the order.",
    tone: "warning",
  },
  pinSaved: {
    message: "Location set — you can keep shopping.",
    tone: "success",
  },
  browserNoGeo: {
    message:
      "Your browser can't share location — please type your address below.",
    tone: "warning",
  },
  detectFailed: {
    message: "Couldn't detect your location — please type your address below.",
    tone: "warning",
  },
  pickOnMap: {
    message: "Detect your location or enter an area name first.",
    tone: "info",
  },
  typeArea: {
    message: "Type an area to continue, or detect location.",
    tone: "info",
  },
  confirmPin: {
    message: "Area set — confirm location to continue.",
    tone: "info",
  },
  locationFound: {
    message: "Location found.",
    tone: "success",
  },
} as const satisfies Record<string, LocationToast>;

export const LOCATION_TOAST_SAMPLES: {
  label: string;
  toast: LocationToast;
}[] = [
  { label: "We deliver here", toast: LOCATION_TOASTS.deliveringHere },
  { label: "Location saved", toast: LOCATION_TOASTS.addressSaved },
  { label: "Outside area", toast: LOCATION_TOASTS.notServiceable },
  { label: "Check failed", toast: LOCATION_TOASTS.checkFailed },
  { label: "Allow location", toast: LOCATION_TOASTS.allowLocation },
  { label: "Need address", toast: LOCATION_TOASTS.needAddress },
  { label: "Need details", toast: LOCATION_TOASTS.needAddressDetails },
  { label: "Pin saved", toast: LOCATION_TOASTS.pinSaved },
  { label: "No browser geo", toast: LOCATION_TOASTS.browserNoGeo },
  { label: "Detect failed", toast: LOCATION_TOASTS.detectFailed },
  { label: "Pick on map", toast: LOCATION_TOASTS.pickOnMap },
  { label: "Type area", toast: LOCATION_TOASTS.typeArea },
  { label: "Confirm pin", toast: LOCATION_TOASTS.confirmPin },
  { label: "Location found", toast: LOCATION_TOASTS.locationFound },
];

/** Match detect API copy to a known toast tone (fallback warning). */
export function locationToastToneFor(
  message: string,
): LocationToastTone {
  for (const toast of Object.values(LOCATION_TOASTS)) {
    if (toast.message === message) return toast.tone;
  }
  if (/can't share location|couldn't detect|denied|permission/i.test(message)) {
    return "warning";
  }
  return "warning";
}
