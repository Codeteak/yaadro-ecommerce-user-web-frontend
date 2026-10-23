"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LocateFixed, MapPin, X } from "lucide-react";

type Address = {
  house: string;
  street: string;
  landmark: string;
  city: string;
  pin: string;
};

const EMPTY_ADDRESS: Address = { house: "", street: "", landmark: "", city: "", pin: "" };
const STORAGE_KEY = "yaadro-delivery-address";

function addressLabel(a: Address): string {
  return [a.house, a.street, a.city].filter(Boolean).join(", ");
}

/**
 * Hero top bar: shop profile (avatar + specific shop name) with the
 * delivery-location line under the name, plus Sign in. Tapping the
 * location line opens the address sheet from the bottom.
 *
 * Data honesty: shop identity comes from `getShopSeo()` (falls back to
 * Yaadro until the shop-profile API exists). The address is UI-only for
 * now — saved to localStorage, never presented as server-saved until a
 * real address API is connected. Location detection needs
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Google Geocoding API); without it the
 * Detect button explains itself and manual entry still works fully.
 */
export function HomeTopBar({
  shopName,
  shopImage,
}: {
  shopName: string;
  shopImage: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Address>(EMPTY_ADDRESS);
  const [savedOverride, setSavedOverride] = useState<Address | null>(null);
  const [houseError, setHouseError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const houseRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);

  // Previously saved (local) address, read hydration-safely.
  const savedRaw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  const storedSaved = useMemo<Address | null>(() => {
    if (!savedRaw) return null;
    try {
      return { ...EMPTY_ADDRESS, ...(JSON.parse(savedRaw) as Partial<Address>) };
    } catch {
      return null;
    }
  }, [savedRaw]);
  const saved = savedOverride ?? storedSaved;

  const openSheet = () => {
    setForm(saved ?? EMPTY_ADDRESS);
    setHouseError(false);
    setNotice(null);
    setOpen(true);
  };

  // Scroll lock + Escape while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const set = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (field === "house") setHouseError(false);
  };

  const detectLocation = () => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setNotice("Location detection isn't available yet — please type your address below.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setNotice("Your browser can't share location — please type your address below.");
      return;
    }
    setDetecting(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        let streetFound = false;
        try {
          const { latitude, longitude } = pos.coords;
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
            setNotice(
              json?.error_message ??
                "Couldn't detect your location — please type your address below.",
            );
            return;
          }

          const results = json.results;
          // Google returns many results (nearest first) and results[0]
          // often has no street at all — search across all of them.
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
          if (!street) {
            // Last resort: first comma segments of the most specific
            // formatted address, skipping a leading plus-code segment.
            const best =
              results.find((r) => r.types?.includes("street_address")) ?? results[0];
            const segments = (best.formatted_address ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s && !/^[A-Z0-9]{4}\+[A-Z0-9]{2,}$/i.test(s));
            street = segments.slice(0, 2).join(", ");
          }

          streetFound = Boolean(street);
          setForm((f) => ({
            ...f,
            street,
            landmark: pickAcross("neighborhood", "premise"),
            city: pickAcross("locality"),
            pin: pickAcross("postal_code"),
          }));
          setNotice(
            streetFound
              ? "Location found — now add your house / flat number to finish."
              : "Location found, but we couldn't read the street — please type it below.",
          );
        } catch {
          setNotice("Couldn't read that location — please type your address below.");
        } finally {
          setDetecting(false);
          (streetFound ? houseRef : streetRef).current?.focus();
        }
      },
      () => {
        setDetecting(false);
        setNotice("Location permission was denied — please type your address below.");
      },
      { timeout: 10000 },
    );
  };

  const save = () => {
    if (!form.house.trim()) {
      setHouseError(true);
      houseRef.current?.focus();
      return;
    }
    const trimmed: Address = {
      house: form.house.trim(),
      street: form.street.trim(),
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      pin: form.pin.trim(),
    };
    setSavedOverride(trimmed);
    setForm(trimmed);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // persistence is best-effort
    }
    setOpen(false);
  };

  const inputClass =
    "h-12 w-full rounded-2xl bg-white px-4 text-sm text-ink ring-1 ring-leaf/15 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-leaf";

  return (
    <>
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {shopImage.startsWith("http") ? (
            // Remote shop profile (host unknown ahead of time) — plain img.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shopImage}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80"
            />
          ) : (
            <Image
              src={shopImage}
              alt=""
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-bold text-forest">
              {shopName}
            </p>

            {/* Location chooser — two-line block under the shop name */}
            <button
              type="button"
              onClick={openSheet}
              className="mt-1 flex max-w-full cursor-pointer items-start gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              aria-haspopup="dialog"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[9px] font-bold tracking-[0.16em] text-black uppercase">
                  Deliver to
                </span>
                <span className="flex items-center gap-1">
                  <span className="truncate text-[13px] leading-tight font-semibold text-leaf">
                    {saved ? addressLabel(saved) : "Choose your location"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-leaf/60" aria-hidden />
                </span>
              </span>
            </button>
          </div>
        </div>
        <Link
          href="/login"
          className="shrink-0 rounded-full bg-track px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Sign in
        </Link>
      </header>

      {/* Address sheet — slides up from the bottom */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Delivery address">
          <button
            type="button"
            aria-label="Close address panel"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
          />
          <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-paper px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-forest/15" aria-hidden />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Delivery address</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-forest ring-1 ring-leaf/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <X className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-mint text-sm font-semibold text-forest ring-1 ring-leaf/25 transition hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-wait disabled:opacity-70"
            >
              <LocateFixed className={`h-4.5 w-4.5 ${detecting ? "animate-pulse" : ""}`} aria-hidden />
              {detecting ? "Detecting your location…" : "Detect my location"}
            </button>
            {notice && (
              <p className="mt-2.5 text-center text-[13px] leading-5 text-muted" role="status">
                {notice}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="addr-house" className="mb-1.5 block text-[13px] font-semibold text-ink">
                  House / Flat no. <span className="text-red-500" aria-hidden>*</span>
                </label>
                <input
                  id="addr-house"
                  ref={houseRef}
                  value={form.house}
                  onChange={set("house")}
                  placeholder="e.g. B2, Skyline Apartments"
                  className={inputClass}
                  aria-required="true"
                  aria-invalid={houseError}
                />
                {houseError && (
                  <p className="mt-1.5 text-[13px] font-medium text-red-600">
                    House / flat number is required for delivery.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="addr-street" className="mb-1.5 block text-[13px] font-semibold text-ink">
                  Street / Area{" "}
                  <span className="font-normal text-muted">(auto-fills with Detect location)</span>
                </label>
                <input
                  id="addr-street"
                  ref={streetRef}
                  value={form.street}
                  onChange={set("street")}
                  placeholder="e.g. MG Road"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="addr-landmark" className="mb-1.5 block text-[13px] font-semibold text-ink">
                  Landmark <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="addr-landmark"
                  value={form.landmark}
                  onChange={set("landmark")}
                  placeholder="e.g. Near Central Mall"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              className="mt-5 h-12 w-full cursor-pointer rounded-full bg-track text-sm font-semibold text-black shadow-[0_10px_24px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Save address
            </button>
            <p className="mt-2.5 text-center text-xs text-muted">
              Saved on this device until your account address book is connected.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
