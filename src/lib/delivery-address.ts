export type DeliveryAddress = {
  house: string;
  street: string;
  landmark: string;
  city: string;
  pin: string;
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

export function readDeliveryAddress(): DeliveryAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DELIVERY_ADDRESS_KEY);
    if (!raw) return null;
    return {
      ...EMPTY_DELIVERY_ADDRESS,
      ...(JSON.parse(raw) as Partial<DeliveryAddress>),
    };
  } catch {
    return null;
  }
}

export function writeDeliveryAddress(address: DeliveryAddress): void {
  try {
    window.localStorage.setItem(DELIVERY_ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // persistence is best-effort
  }
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
