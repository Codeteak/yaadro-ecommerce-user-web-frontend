/**
 * Multi-address book (localStorage) until an addresses API exists.
 * Selecting / saving syncs the active row into `yaadro-delivery-address`
 * so checkout / home keep working.
 */
import {
  writeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";

export type AddressType = "house" | "office" | "other";

export type SavedAddress = {
  id: string;
  /** Display name e.g. Home, Office, Parents */
  label: string;
  type: AddressType;
  /** Building / floor / flat */
  building: string;
  street: string;
  /** Locality / area headline from map step */
  area: string;
  city: string;
  pin: string;
  landmark: string;
  instructions: string;
  isDefault: boolean;
  /** Optional coords from detect (stub map may omit) */
  lat?: number;
  lng?: number;
};

export const SAVED_ADDRESSES_KEY = "yaadro-saved-addresses-v1";
export const SAVED_ADDRESSES_EVENT = "yaadro-saved-addresses";

const SEED: SavedAddress[] = [
  {
    id: "addr-home",
    label: "Home",
    type: "house",
    building: "arine amaryllis 101",
    street: "Begur Road",
    area: "Begur",
    city: "Bengaluru",
    pin: "560114",
    landmark: "",
    instructions: "",
    isDefault: true,
  },
  {
    id: "addr-office",
    label: "Office",
    type: "office",
    building: "12 Avinashi Road",
    street: "Peelamedu",
    area: "Coimbatore",
    city: "Coimbatore",
    pin: "641014",
    landmark: "Near bus stand",
    instructions: "",
    isDefault: false,
  },
];

function notify() {
  window.dispatchEvent(new Event(SAVED_ADDRESSES_EVENT));
}

function readRaw(): { list: SavedAddress[]; selectedId: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVED_ADDRESSES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      list?: SavedAddress[];
      selectedId?: string | null;
    };
    if (!Array.isArray(parsed.list)) return null;
    return {
      list: parsed.list,
      selectedId: parsed.selectedId ?? null,
    };
  } catch {
    return null;
  }
}

function writeRaw(list: SavedAddress[], selectedId: string | null) {
  try {
    window.localStorage.setItem(
      SAVED_ADDRESSES_KEY,
      JSON.stringify({ list, selectedId }),
    );
  } catch {
    // best-effort
  }
  notify();
}

/** Ensure seed data once so playground list isn't empty. */
export function ensureSavedAddressesSeeded(): {
  list: SavedAddress[];
  selectedId: string | null;
} {
  const existing = readRaw();
  if (existing && existing.list.length > 0) return existing;
  const selectedId = SEED.find((a) => a.isDefault)?.id ?? SEED[0]?.id ?? null;
  writeRaw(SEED, selectedId);
  if (selectedId) {
    const row = SEED.find((a) => a.id === selectedId);
    if (row) syncActiveDelivery(row);
  }
  return { list: SEED, selectedId };
}

export function listSavedAddresses(): SavedAddress[] {
  return ensureSavedAddressesSeeded().list;
}

export function getSelectedAddressId(): string | null {
  return ensureSavedAddressesSeeded().selectedId;
}

export function getSelectedAddress(): SavedAddress | null {
  const { list, selectedId } = ensureSavedAddressesSeeded();
  if (!selectedId) return list.find((a) => a.isDefault) ?? list[0] ?? null;
  return list.find((a) => a.id === selectedId) ?? null;
}

export function savedToDelivery(a: SavedAddress): DeliveryAddress {
  return {
    house: a.building || a.label,
    street: [a.street, a.area].filter(Boolean).join(", "),
    landmark: a.landmark,
    city: a.city,
    pin: a.pin,
  };
}

export function formatSavedAddressLine(a: SavedAddress): string {
  return [a.building, a.street, a.area, a.city, a.pin]
    .filter(Boolean)
    .join(", ");
}

function syncActiveDelivery(a: SavedAddress) {
  writeDeliveryAddress(savedToDelivery(a));
}

export function selectSavedAddress(id: string): void {
  const { list } = ensureSavedAddressesSeeded();
  const row = list.find((a) => a.id === id);
  if (!row) return;
  writeRaw(list, id);
  syncActiveDelivery(row);
}

export function setDefaultSavedAddress(id: string): void {
  const { list, selectedId } = ensureSavedAddressesSeeded();
  const next = list.map((a) => ({ ...a, isDefault: a.id === id }));
  writeRaw(next, selectedId ?? id);
  const row = next.find((a) => a.id === id);
  if (row) syncActiveDelivery(row);
}

export function getSavedAddress(id: string): SavedAddress | undefined {
  return listSavedAddresses().find((a) => a.id === id);
}

export function deleteSavedAddress(id: string): void {
  const { list, selectedId } = ensureSavedAddressesSeeded();
  const next = list.filter((a) => a.id !== id);
  if (next.length === 0) {
    writeRaw([], null);
    return;
  }
  let nextSelected = selectedId;
  if (selectedId === id) {
    nextSelected = next.find((a) => a.isDefault)?.id ?? next[0]?.id ?? null;
  }
  const hadDefault = list.find((a) => a.id === id)?.isDefault;
  if (hadDefault && next[0] && !next.some((a) => a.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
    nextSelected = next[0].id;
  }
  writeRaw(next, nextSelected);
  const active = next.find((a) => a.id === nextSelected);
  if (active) syncActiveDelivery(active);
}

export function upsertSavedAddress(
  address: Omit<SavedAddress, "id"> & { id?: string },
): SavedAddress {
  const { list, selectedId } = ensureSavedAddressesSeeded();
  const id = address.id ?? `addr-${Date.now()}`;
  let next = [...list];
  const row: SavedAddress = {
    id,
    label: address.label.trim() || "Address",
    type: address.type,
    building: address.building.trim(),
    street: address.street.trim(),
    area: address.area.trim(),
    city: address.city.trim(),
    pin: address.pin.trim(),
    landmark: address.landmark.trim(),
    instructions: address.instructions.trim(),
    isDefault: address.isDefault,
    lat: address.lat,
    lng: address.lng,
  };

  if (row.isDefault) {
    next = next.map((a) => ({ ...a, isDefault: false }));
  }

  const idx = next.findIndex((a) => a.id === id);
  if (idx >= 0) next[idx] = row;
  else next.push(row);

  const hasDefault = next.some((a) => a.isDefault);
  if (!hasDefault && next[0]) next[0] = { ...next[0], isDefault: true };

  const newSelected = row.isDefault ? id : (selectedId ?? id);
  writeRaw(next, newSelected);
  const active = next.find((a) => a.id === newSelected) ?? row;
  syncActiveDelivery(active);
  return row;
}

export function subscribeSavedAddresses(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_ADDRESSES_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SAVED_ADDRESSES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SAVED_ADDRESSES_EVENT, onChange);
  };
}

export type DetectedPlace = {
  area: string;
  street: string;
  city: string;
  pin: string;
  landmark: string;
  lat?: number;
  lng?: number;
  formatted: string;
};

/**
 * Geolocation + reverse geocode when Maps key exists; otherwise a sample
 * stub place so playground works without a live map API.
 */
export async function detectMyPlace(): Promise<
  | { ok: true; place: DetectedPlace }
  | { ok: false; message: string }
> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!("geolocation" in navigator)) {
    return {
      ok: false,
      message: "Your browser can't share location — use the search field or continue with a sample area.",
    };
  }

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 10000 },
    );
  });

  if (!position) {
    // Stub so playground still advances without permission / API.
    return {
      ok: true,
      place: {
        area: "Akshayanagara West",
        street: "1st D Cross Rd",
        city: "Bengaluru",
        pin: "560114",
        landmark: "",
        formatted:
          "NO 320, 1st D Cross Rd, Akshayanagara West, Bengaluru, Karnataka 560114",
      },
    };
  }

  const { latitude, longitude } = position.coords;

  if (!key) {
    return {
      ok: true,
      place: {
        area: "Detected location",
        street: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        city: "Bengaluru",
        pin: "",
        landmark: "",
        lat: latitude,
        lng: longitude,
        formatted: `Near ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (map API not configured)`,
      },
    };
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`,
    );
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      error_message?: string;
      results?: {
        formatted_address?: string;
        types?: string[];
        address_components?: { long_name: string; types: string[] }[];
      }[];
    } | null;

    if (!json || json.status !== "OK" || !json.results?.length) {
      return {
        ok: false,
        message:
          json?.error_message ??
          "Couldn't detect your location — try again or type details next.",
      };
    }

    const results = json.results;
    const pickAcross = (...types: string[]) => {
      for (const result of results) {
        const hit = result.address_components?.find((c) =>
          types.some((t) => c.types.includes(t)),
        );
        if (hit) return hit.long_name;
      }
      return "";
    };

    let street =
      [pickAcross("street_number"), pickAcross("route")]
        .filter(Boolean)
        .join(" ") || pickAcross("sublocality", "sublocality_level_1");
    const area =
      pickAcross("sublocality", "sublocality_level_1", "neighborhood") ||
      pickAcross("locality");
    const formatted = results[0]?.formatted_address ?? "";

    return {
      ok: true,
      place: {
        area: area || "Your area",
        street,
        city: pickAcross("locality"),
        pin: pickAcross("postal_code"),
        landmark: pickAcross("neighborhood", "premise"),
        lat: latitude,
        lng: longitude,
        formatted,
      },
    };
  } catch {
    return {
      ok: false,
      message: "Couldn't read that location — try again or continue manually.",
    };
  }
}
