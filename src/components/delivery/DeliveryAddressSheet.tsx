"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { LocateFixed } from "lucide-react";
import { CloseButton } from "@/components/navigation/CloseButton";
import {
  EMPTY_DELIVERY_ADDRESS,
  readDeliveryAddress,
  writeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";

type DeliveryAddressSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (localStorage already updated). */
  onSaved?: (address: DeliveryAddress) => void;
};

/**
 * Bottom sheet to set delivery address (UI-only / localStorage until an
 * address API exists). Shared by home top bar and cart Change.
 */
export function DeliveryAddressSheet({
  open,
  onOpenChange,
  onSaved,
}: DeliveryAddressSheetProps) {
  const [form, setForm] = useState<DeliveryAddress>(EMPTY_DELIVERY_ADDRESS);
  const [houseError, setHouseError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const houseRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(readDeliveryAddress() ?? EMPTY_DELIVERY_ADDRESS);
    setHouseError(false);
    setNotice(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const set =
    (field: keyof DeliveryAddress) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (field === "house") setHouseError(false);
    };

  const detectLocation = () => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setNotice(
        "Location detection isn't available yet — please type your address below.",
      );
      return;
    }
    if (!("geolocation" in navigator)) {
      setNotice(
        "Your browser can't share location — please type your address below.",
      );
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
            const best =
              results.find((r) => r.types?.includes("street_address")) ??
              results[0];
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
          setNotice(
            "Couldn't read that location — please type your address below.",
          );
        } finally {
          setDetecting(false);
          (streetFound ? houseRef : streetRef).current?.focus();
        }
      },
      () => {
        setDetecting(false);
        setNotice(
          "Location permission was denied — please type your address below.",
        );
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
    const trimmed: DeliveryAddress = {
      house: form.house.trim(),
      street: form.street.trim(),
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      pin: form.pin.trim(),
    };
    writeDeliveryAddress(trimmed);
    onSaved?.(trimmed);
    onOpenChange(false);
  };

  const inputClass =
    "h-12 w-full rounded-2xl bg-white px-4 text-sm text-ink ring-1 ring-leaf/15 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-leaf";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Delivery address"
    >
      <button
        type="button"
        aria-label="Close address panel"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
      />
      <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-paper px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-forest/15" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Delivery address</h2>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>

        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-mint text-sm font-semibold text-forest ring-1 ring-leaf/25 transition hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-wait disabled:opacity-70"
        >
          <LocateFixed
            className={`h-4.5 w-4.5 ${detecting ? "animate-pulse" : ""}`}
            aria-hidden
          />
          {detecting ? "Detecting your location…" : "Detect my location"}
        </button>
        {notice && (
          <p
            className="mt-2.5 text-center text-[13px] leading-5 text-muted"
            role="status"
          >
            {notice}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label
              htmlFor="addr-house"
              className="mb-1.5 block text-[13px] font-semibold text-ink"
            >
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
            <label
              htmlFor="addr-street"
              className="mb-1.5 block text-[13px] font-semibold text-ink"
            >
              Street / Area{" "}
              <span className="font-normal text-muted">
                (auto-fills with Detect location)
              </span>
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
            <label
              htmlFor="addr-landmark"
              className="mb-1.5 block text-[13px] font-semibold text-ink"
            >
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
  );
}
