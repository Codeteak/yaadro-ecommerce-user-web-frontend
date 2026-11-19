"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Briefcase, Home, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildPlaceEmbedUrl } from "@/lib/live-track-map";
import {
  upsertSavedAddress,
  type AddressType,
  type DetectedPlace,
  type SavedAddress,
} from "@/lib/saved-addresses";

export function AddressDetailsStep({
  place,
  editing,
  onSaved,
}: {
  place: DetectedPlace;
  editing: SavedAddress | null;
  onSaved: () => void;
}) {
  const formId = useId();
  const [type, setType] = useState<AddressType>(editing?.type ?? "house");
  const [label, setLabel] = useState(
    editing?.label ??
      (editing?.type === "office"
        ? "Office"
        : editing?.type === "other"
          ? ""
          : "Home"),
  );
  const [building, setBuilding] = useState(editing?.building ?? "");
  const [street, setStreet] = useState(editing?.street ?? place.street);
  const [instructions, setInstructions] = useState(
    editing?.instructions ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const miniMapUrl = useMemo(() => {
    if (typeof place.lat !== "number" || typeof place.lng !== "number") {
      return null;
    }
    return buildPlaceEmbedUrl(place.lat, place.lng);
  }, [place.lat, place.lng]);

  const chooseType = (next: AddressType) => {
    setType(next);
    if (editing) return;
    if (next === "house") setLabel((current) => current || "Home");
    if (next === "office") {
      setLabel((current) => (current === "Home" || !current ? "Office" : current));
    }
  };

  const save = () => {
    if (!label.trim() || !building.trim()) {
      setError("Save name and building / floor are required.");
      return;
    }
    upsertSavedAddress({
      id: editing?.id,
      label: label.trim(),
      type,
      building: building.trim(),
      street: street.trim() || place.street,
      area: place.area || editing?.area || "",
      city: place.city || editing?.city || "",
      pin: place.pin || editing?.pin || "",
      landmark: place.landmark || editing?.landmark || "",
      instructions: instructions.trim(),
      isDefault: true,
      lat: place.lat ?? editing?.lat,
      lng: place.lng ?? editing?.lng,
    });
    onSaved();
  };

  const types: { id: AddressType; label: string; icon: ReactNode }[] = [
    { id: "house", label: "House", icon: <Home className="h-4 w-4" /> },
    { id: "office", label: "Office", icon: <Briefcase className="h-4 w-4" /> },
    {
      id: "other",
      label: "Other",
      icon: <Navigation className="h-4 w-4" />,
    },
  ];

  const fieldClass =
    "mt-1.5 h-12 w-full rounded-2xl bg-white px-4 text-sm text-ink ring-1 ring-forest/12 outline-none placeholder:text-muted/65 focus:ring-2 focus:ring-leaf";

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <p className="text-sm font-extrabold text-black">{place.area}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">
          {place.formatted}
        </p>
      </div>

      <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-forest/10">
        <h3 className="text-sm font-extrabold text-black">Location details</h3>
        <div className="mt-3 flex gap-2">
          {types.map((t) => {
            const active = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseType(t.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                  active
                    ? "bg-track text-black shadow-sm"
                    : "bg-paper text-muted ring-1 ring-forest/10",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor={`${formId}-label`}>
          Save address as <span className="text-red-500">*</span>
        </label>
        <input
          id={`${formId}-label`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Parents, Gym, Friend"
          className={fieldClass}
        />

        <label className="mt-3 block text-[13px] font-semibold text-ink" htmlFor={`${formId}-building`}>
          Building / Floor <span className="text-red-500">*</span>
        </label>
        <input
          id={`${formId}-building`}
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="e.g. Tower A, Floor 5"
          className={fieldClass}
        />

        <label className="mt-3 block text-[13px] font-semibold text-ink" htmlFor={`${formId}-street`}>
          Street <span className="font-normal text-muted">(recommended)</span>
        </label>
        <input
          id={`${formId}-street`}
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Street name"
          className={fieldClass}
        />

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-paper px-3 py-3 ring-1 ring-forest/10">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
          <p className="min-w-0 flex-1 text-[13px] leading-5 text-muted">
            {place.formatted}
          </p>
        </div>

        <div className="relative mt-3 h-28 overflow-hidden rounded-2xl bg-[#dce8dc] ring-1 ring-forest/10">
          {miniMapUrl ? (
            <iframe
              title="Selected delivery location"
              src={miniMapUrl}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <>
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  backgroundImage:
                    "linear-gradient(#9cb89c 1px, transparent 1px), linear-gradient(90deg, #9cb89c 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                aria-hidden
              />
              <div className="absolute inset-0 grid place-items-center">
                <MapPin
                  className="h-8 w-8 text-leaf"
                  fill="currentColor"
                  aria-hidden
                />
              </div>
            </>
          )}
        </div>

      </section>

      <section>
        <h3 className="text-sm font-extrabold text-black">
          Delivery instructions{" "}
          <span className="font-normal text-muted">(optional)</span>
        </h3>
        <input
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions to reach location"
          className={cn(fieldClass, "mt-2")}
        />
      </section>

      {error ? (
        <p className="text-center text-[13px] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        className="h-12 w-full rounded-full bg-track text-sm font-semibold text-black shadow-[0_10px_24px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        Save address
      </button>
    </div>
  );
}
