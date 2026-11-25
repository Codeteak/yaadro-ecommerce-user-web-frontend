export type DeliveryAddress = {
  house: string;
  street: string;
  landmark: string;
  city: string;
  pin: string;
  /** Device pin used for the delivery-area check. */
  lat?: number;
  lng?: number;
  /**
   * Last home/checkout radius preview for this pin.
   * `undefined` = not checked yet; `false` = outside shop radius.
   */
  serviceable?: boolean;
};

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddress = {
  house: "",
  street: "",
  landmark: "",
  city: "",
  pin: "",
};

export const DELIVERY_ADDRESS_KEY = "yaadro-delivery-address";
/** Same-tab updates (storage event only fires across tabs). */
export const DELIVERY_ADDRESS_EVENT = "yaadro-delivery-address";

export function formatDeliveryAddressLabel(a: DeliveryAddress): string {
  return [a.house, a.street, a.city].filter(Boolean).join(", ");
}

/** True when lat/lng are present (browse pin from detect / map). */
export function hasDeliveryPin(a: DeliveryAddress | null | undefined): boolean {
  return Boolean(
    a && typeof a.lat === "number" && typeof a.lng === "number",
  );
}

/**
 * True when the shopper filled building / house details (required to place order).
 * Pin-only browse rows leave `house` empty.
 */
export function hasDeliveryDetails(
  a: DeliveryAddress | null | undefined,
): boolean {
  return Boolean(a?.house?.trim());
}

/** Enough to skip the soft home location prompt and show Deliver to. */
export function hasBrowseLocation(
  a: DeliveryAddress | null | undefined,
): boolean {
  if (!a) return false;
  if (hasDeliveryDetails(a) || hasDeliveryPin(a)) return true;
  return Boolean(a.street?.trim() || a.city?.trim());
}

/** Pin was checked and falls outside `service_area_radius_meters`. */
export function isOutsideDeliveryRadius(
  a: DeliveryAddress | null | undefined,
): boolean {
  return a?.serviceable === false;
}

/** Home / checkout line: prefer full details, else area / pin label. */
export function formatDeliveryLocationLabel(
  a: DeliveryAddress | null | undefined,
): string | null {
  if (!a) return null;
  const details = formatDeliveryAddressLabel(a);
  if (details) return details;
  const soft = [a.street, a.city].filter(Boolean).join(", ");
  if (soft) return soft;
  if (hasDeliveryPin(a)) return "Current location";
  return null;
}

/** Stable snapshot for useSyncExternalStore (Object.is must not churn). */
let snapshot: DeliveryAddress | null = null;
let snapshotRaw: string | null = null;
let snapshotHydrated = false;

function parseDeliveryAddress(raw: string | null): DeliveryAddress | null {
  if (!raw) return null;
  try {
    return {
      ...EMPTY_DELIVERY_ADDRESS,
      ...(JSON.parse(raw) as Partial<DeliveryAddress>),
    };
  } catch {
    return null;
  }
}

/**
 * Client getSnapshot — same object reference while localStorage is unchanged.
 * Required by useSyncExternalStore to avoid infinite re-renders.
 */
export function readDeliveryAddress(): DeliveryAddress | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DELIVERY_ADDRESS_KEY);
  } catch {
    return null;
  }
  if (snapshotHydrated && raw === snapshotRaw) {
    return snapshot;
  }
  snapshotHydrated = true;
  snapshotRaw = raw;
  snapshot = parseDeliveryAddress(raw);
  return snapshot;
}

/** Server / hydration snapshot — always null (no localStorage on SSR). */
export function getDeliveryAddressServerSnapshot(): null {
  return null;
}

export function writeDeliveryAddress(address: DeliveryAddress): void {
  const raw = JSON.stringify(address);
  try {
    window.localStorage.setItem(DELIVERY_ADDRESS_KEY, raw);
  } catch {
    // persistence is best-effort
  }
  snapshotHydrated = true;
  snapshotRaw = raw;
  snapshot = { ...EMPTY_DELIVERY_ADDRESS, ...address };
  window.dispatchEvent(new Event(DELIVERY_ADDRESS_EVENT));
}

/** Forget the Deliver-to address (sign out). */
export function clearDeliveryAddress(): void {
  try {
    window.localStorage.removeItem(DELIVERY_ADDRESS_KEY);
  } catch {
    // best-effort
  }
  snapshotHydrated = true;
  snapshotRaw = null;
  snapshot = null;
  window.dispatchEvent(new Event(DELIVERY_ADDRESS_EVENT));
}

export function subscribeDeliveryAddress(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === DELIVERY_ADDRESS_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DELIVERY_ADDRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DELIVERY_ADDRESS_EVENT, onChange);
  };
}
