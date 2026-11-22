/**
 * One delivery address on this device (localStorage) until an addresses API exists.
 * Saving syncs that row into `yaadro-delivery-address` so checkout and home keep working.
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

function oneAddress(
  list: SavedAddress[],
  selectedId: string | null,
): { list: SavedAddress[]; selectedId: string | null } {
  if (list.length === 0) return { list: [], selectedId: null };
  const chosen =
    list.find((address) => address.id === selectedId) ??
    list.find((address) => address.isDefault) ??
    list[0];
  if (!chosen) return { list: [], selectedId: null };
  return {
    list: [{ ...chosen, isDefault: true }],
    selectedId: chosen.id,
  };
}

/** Read the saved address. Older books that stored several rows keep only the active one. */
function readBook(): { list: SavedAddress[]; selectedId: string | null } {
  const existing = readRaw();
  if (!existing || existing.list.length === 0) return { list: [], selectedId: null };
  const single = oneAddress(existing.list, existing.selectedId);
  if (existing.list.length > 1) {
    try {
      window.localStorage.setItem(
        SAVED_ADDRESSES_KEY,
        JSON.stringify({ list: single.list, selectedId: single.selectedId }),
      );
    } catch {
      // best-effort
    }
  }
  return single;
}

export function listSavedAddresses(): SavedAddress[] {
  return readBook().list;
}

export function getSelectedAddressId(): string | null {
  return readBook().selectedId;
}

export function getSelectedAddress(): SavedAddress | null {
  const { list, selectedId } = readBook();
  if (!selectedId) return list[0] ?? null;
  return list.find((address) => address.id === selectedId) ?? list[0] ?? null;
}

export function savedToDelivery(a: SavedAddress): DeliveryAddress {
  return {
    // Building only — empty while browse-pin so checkout still asks for details.
    house: a.building.trim(),
    street: [a.street, a.area].filter(Boolean).join(", "),
    landmark: a.landmark,
    city: a.city,
    pin: a.pin,
    ...(typeof a.lat === "number" && typeof a.lng === "number"
      ? { lat: a.lat, lng: a.lng }
      : {}),
  };
}

/** Pin / area only — enough to browse; details filled later at place order. */
export function saveBrowsePin(place: DetectedPlace): SavedAddress {
  const existing = listSavedAddresses()[0];
  return upsertSavedAddress({
    id: existing?.id,
    label: existing?.label?.trim() || "Delivery",
    type: existing?.type ?? "house",
    building: existing?.building ?? "",
    street: place.street || existing?.street || "",
    area: place.area || existing?.area || "",
    city: place.city || existing?.city || "",
    pin: place.pin || existing?.pin || "",
    landmark: place.landmark || existing?.landmark || "",
    instructions: existing?.instructions ?? "",
    isDefault: true,
    lat: place.lat,
    lng: place.lng,
  });
}

export function isSavedAddressDetailsComplete(
  a: SavedAddress | null | undefined,
): boolean {
  return Boolean(a?.building?.trim());
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
  const { list } = readBook();
  const row = list.find((a) => a.id === id);
  if (!row) return;
  writeRaw(list, id);
  syncActiveDelivery(row);
}

export function getSavedAddress(id: string): SavedAddress | undefined {
  return listSavedAddresses().find((a) => a.id === id);
}

export function deleteSavedAddress(id: string): void {
  const { list } = readBook();
  if (!list.some((address) => address.id === id)) return;
  writeRaw([], null);
}

export function upsertSavedAddress(
  address: Omit<SavedAddress, "id"> & { id?: string },
): SavedAddress {
  const current = readBook().list[0];
  const id = address.id ?? current?.id ?? `addr-${Date.now()}`;
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
    isDefault: true,
    lat: address.lat,
    lng: address.lng,
  };
  writeRaw([row], id);
  syncActiveDelivery(row);
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

type GeocodeResult = {
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
  address_components?: { long_name: string; types: string[] }[];
};

type GeocodeJson = {
  status?: string;
  error_message?: string;
  results?: GeocodeResult[];
};

function mapsKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : null;
}

type AddressComponentLike = { long_name: string; types: string[] };

/** Build a DetectedPlace from geocode / Places address components. */
export function detectedPlaceFromComponents(
  components: AddressComponentLike[] | undefined,
  opts: {
    latitude: number;
    longitude: number;
    formatted?: string;
    fallbackArea?: string;
  },
): DetectedPlace {
  const list = components ?? [];
  const pick = (...types: string[]) => {
    const hit = list.find((c) => types.some((t) => c.types.includes(t)));
    return hit?.long_name ?? "";
  };

  const street =
    [pick("street_number"), pick("route")].filter(Boolean).join(" ") ||
    pick("sublocality", "sublocality_level_1");
  const area =
    pick("sublocality", "sublocality_level_1", "neighborhood") ||
    pick("locality") ||
    opts.fallbackArea ||
    "Your area";

  return {
    area,
    street,
    city: pick("locality"),
    pin: pick("postal_code"),
    landmark: pick("neighborhood", "premise"),
    lat: opts.latitude,
    lng: opts.longitude,
    formatted: opts.formatted ?? "",
  };
}

function placeFromGeocodeResults(
  results: GeocodeResult[],
  latitude: number,
  longitude: number,
): DetectedPlace {
  const pickAcross = (...types: string[]) => {
    for (const result of results) {
      const hit = result.address_components?.find((c) =>
        types.some((t) => c.types.includes(t)),
      );
      if (hit) return hit.long_name;
    }
    return "";
  };

  return detectedPlaceFromComponents(results[0]?.address_components, {
    latitude,
    longitude,
    formatted: results[0]?.formatted_address ?? "",
    fallbackArea: pickAcross("locality") || undefined,
  });
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<DetectedPlace | null> {
  const base = (
    process.env.NEXT_PUBLIC_NOMINATIM_URL?.trim() ||
    "https://nominatim.openstreetmap.org"
  ).replace(/\/+$/, "");
  try {
    const res = await fetch(
      `${base}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
        },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      display_name?: string;
      address?: Record<string, string>;
    } | null;
    if (!json?.address) return null;
    const a = json.address;
    const area =
      a.suburb ||
      a.neighbourhood ||
      a.suburb ||
      a.city_district ||
      a.city ||
      a.town ||
      a.village ||
      "Your area";
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    return {
      area,
      street,
      city: a.city || a.town || a.village || a.state || "",
      pin: a.postcode || "",
      landmark: a.amenity || a.building || "",
      lat: latitude,
      lng: longitude,
      formatted: json.display_name || `${area}`,
    };
  } catch {
    return null;
  }
}

/** Reverse-geocode a pin (Google when keyed; Nominatim fallback). */
export async function reverseGeocodeLatLng(
  latitude: number,
  longitude: number,
): Promise<
  | { ok: true; place: DetectedPlace }
  | { ok: false; message: string }
> {
  const key = mapsKey();

  if (key) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`,
      );
      const json = (await res.json().catch(() => null)) as GeocodeJson | null;

      if (json?.status === "OK" && json.results?.length) {
        return {
          ok: true,
          place: placeFromGeocodeResults(json.results, latitude, longitude),
        };
      }
    } catch {
      // fall through to Nominatim
    }
  }

  const nominatim = await reverseGeocodeNominatim(latitude, longitude);
  if (nominatim) return { ok: true, place: nominatim };

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

  return {
    ok: false,
    message: "Couldn't read that location — try again or type details next.",
  };
}

/** Forward-geocode a search string (area / street / pin). */
export async function geocodeSearchQuery(
  query: string,
): Promise<
  | { ok: true; place: DetectedPlace }
  | { ok: false; message: string }
> {
  const q = query.trim();
  if (!q) {
    return { ok: false, message: "Type an area to continue, or detect location." };
  }

  const key = mapsKey();
  if (!key) {
    return {
      ok: true,
      place: {
        area: q,
        street: "",
        city: "",
        pin: "",
        landmark: "",
        formatted: q,
      },
    };
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&region=in`,
    );
    const json = (await res.json().catch(() => null)) as GeocodeJson | null;

    if (!json || json.status !== "OK" || !json.results?.length) {
      return {
        ok: false,
        message:
          json?.error_message ??
          "No match for that search — try another area or detect location.",
      };
    }

    const top = json.results[0];
    const lat = top.geometry?.location?.lat;
    const lng = top.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return {
        ok: false,
        message: "No match for that search — try another area or detect location.",
      };
    }

    return {
      ok: true,
      place: placeFromGeocodeResults(json.results, lat, lng),
    };
  } catch {
    return {
      ok: false,
      message: "Search failed — try again or detect location.",
    };
  }
}

/**
 * Geolocation + reverse geocode when Maps key exists; otherwise a sample
 * stub place so playground works without a live map API.
 */
export async function detectMyPlace(): Promise<
  | { ok: true; place: DetectedPlace }
  | { ok: false; message: string }
> {
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
        lat: 12.8705,
        lng: 77.6208,
        formatted:
          "NO 320, 1st D Cross Rd, Akshayanagara West, Bengaluru, Karnataka 560114",
      },
    };
  }

  const { latitude, longitude } = position.coords;
  return reverseGeocodeLatLng(latitude, longitude);
}
