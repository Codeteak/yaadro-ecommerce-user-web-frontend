"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Briefcase,
  Check,
  Home,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { CloseButton } from "@/components/navigation/CloseButton";
import { cn } from "@/lib/cn";
import {
  detectMyPlace,
  formatSavedAddressLine,
  getSavedAddress,
  getSelectedAddressId,
  listSavedAddresses,
  selectSavedAddress,
  setDefaultSavedAddress,
  subscribeSavedAddresses,
  upsertSavedAddress,
  type AddressType,
  type DetectedPlace,
  type SavedAddress,
} from "@/lib/saved-addresses";

type Step = "list" | "map" | "details";

type AddressBookSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Start on map (Add) instead of list. */
  initialStep?: Step;
  /** When set, open details prefilled for edit (skips map). */
  editId?: string | null;
};

function subscribe(onChange: () => void) {
  return subscribeSavedAddresses(onChange);
}

function getSnapshot() {
  return JSON.stringify({
    list: listSavedAddresses(),
    selectedId: getSelectedAddressId(),
  });
}

function getServerSnapshot() {
  return JSON.stringify({ list: [], selectedId: null });
}

/**
 * Playground address book: saved list → stub map + Detect → details form.
 * Selecting an address syncs checkout delivery localStorage.
 */
export function AddressBookSheet({
  open,
  onOpenChange,
  initialStep = "list",
  editId = null,
}: AddressBookSheetProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [draftPlace, setDraftPlace] = useState<DetectedPlace | null>(null);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  const raw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { list, selectedId } = JSON.parse(raw) as {
    list: SavedAddress[];
    selectedId: string | null;
  };

  useEffect(() => {
    if (!open) return;
    listSavedAddresses();
    setSearchQ("");
    setMapNotice(null);
    if (editId) {
      const row = getSavedAddress(editId);
      if (row) {
        setEditing(row);
        setDraftPlace({
          area: row.area,
          street: row.street,
          city: row.city,
          pin: row.pin,
          landmark: row.landmark,
          lat: row.lat,
          lng: row.lng,
          formatted: formatSavedAddressLine(row),
        });
        setStep("details");
        return;
      }
    }
    setEditing(null);
    setDraftPlace(null);
    setStep(initialStep);
  }, [open, initialStep, editId]);

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

  if (!open) return null;

  const goMap = () => {
    setEditing(null);
    setDraftPlace(null);
    setMapNotice(null);
    setStep("map");
  };

  const onDetect = async () => {
    setDetecting(true);
    setMapNotice(null);
    const result = await detectMyPlace();
    setDetecting(false);
    if (!result.ok) {
      setMapNotice(result.message);
      return;
    }
    setDraftPlace(result.place);
    setMapNotice("Location found — confirm to add details.");
  };

  const onConfirmMap = () => {
    if (!draftPlace) {
      setMapNotice("Detect your location or enter an area name first.");
      return;
    }
    setStep("details");
  };

  const title =
    step === "list"
      ? "Saved addresses"
      : step === "map"
        ? "Select location"
        : "Location details";

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
      />
      <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-paper shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-forest/15" aria-hidden />
        <div className="flex shrink-0 items-center gap-2 px-4 pt-2 pb-3">
          {step !== "list" ? (
            <BackButton
              onClick={() => setStep(step === "details" ? "map" : "list")}
            />
          ) : (
            <span className="size-11 shrink-0" aria-hidden />
          )}
          <h2 className="min-w-0 flex-1 text-center text-lg font-extrabold text-black">
            {title}
          </h2>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {step === "list" ? (
            <ListStep
              list={list}
              selectedId={selectedId}
              onSelect={(id) => {
                selectSavedAddress(id);
                onOpenChange(false);
              }}
              onStar={setDefaultSavedAddress}
              onAdd={goMap}
            />
          ) : null}
          {step === "map" ? (
            <MapStep
              searchQ={searchQ}
              onSearchQ={setSearchQ}
              place={draftPlace}
              detecting={detecting}
              notice={mapNotice}
              onDetect={onDetect}
              onUseSearch={() => {
                const q = searchQ.trim();
                if (!q) {
                  setMapNotice("Type an area to continue, or detect location.");
                  return;
                }
                setDraftPlace({
                  area: q,
                  street: "",
                  city: "",
                  pin: "",
                  landmark: "",
                  formatted: q,
                });
                setMapNotice("Area set — confirm location to continue.");
              }}
              onConfirm={onConfirmMap}
            />
          ) : null}
          {step === "details" && draftPlace ? (
            <DetailsStep
              place={draftPlace}
              editing={editing}
              onSaved={() => {
                onOpenChange(false);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListStep({
  list,
  selectedId,
  onSelect,
  onStar,
  onAdd,
}: {
  list: SavedAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStar: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="pb-4">
      <p className="text-[13px] leading-5 text-muted">
        Choose where you want your order delivered. Star an address to make it
        default.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {list.map((addr) => {
          const selected =
            addr.id === selectedId || (!selectedId && addr.isDefault);
          return (
            <li key={addr.id}>
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-[1.5rem] p-3.5 shadow-[0_8px_22px_rgba(47,107,47,0.1)] transition",
                  selected
                    ? "bg-track"
                    : "bg-white ring-1 ring-black/[0.06]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(addr.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                      selected
                        ? "bg-white text-forest shadow-sm"
                        : "bg-mint text-forest",
                    )}
                  >
                    <Navigation className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-extrabold text-black">
                        {addr.label}
                      </span>
                      {addr.isDefault ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase",
                            selected
                              ? "bg-white/85 text-forest"
                              : "bg-mint text-forest",
                          )}
                        >
                          Default
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-[13px] leading-5",
                        selected ? "text-black/70" : "text-muted",
                      )}
                    >
                      {formatSavedAddressLine(addr)}
                    </span>
                  </span>
                  {selected ? (
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-leaf shadow-sm"
                      aria-hidden
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => onStar(addr.id)}
                  aria-label={
                    addr.isDefault
                      ? `${addr.label} is default`
                      : `Set ${addr.label} as default`
                  }
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      addr.isDefault
                        ? "fill-amber-400 text-amber-400"
                        : "text-black/35",
                    )}
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-start gap-3 rounded-[1.35rem] border border-dashed border-forest/25 bg-white/80 p-3.5 text-left transition hover:border-leaf hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black">
          <Plus className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-extrabold text-ink">
            Add new address
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">
            Detect location or search, then save delivery details
          </span>
        </span>
      </button>
    </div>
  );
}

function MapStep({
  searchQ,
  onSearchQ,
  place,
  detecting,
  notice,
  onDetect,
  onUseSearch,
  onConfirm,
}: {
  searchQ: string;
  onSearchQ: (v: string) => void;
  place: DetectedPlace | null;
  detecting: boolean;
  notice: string | null;
  onDetect: () => void;
  onUseSearch: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <form
        className="flex h-12 items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-forest/12"
        onSubmit={(e) => {
          e.preventDefault();
          onUseSearch();
        }}
      >
        <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <input
          value={searchQ}
          onChange={(e) => onSearchQ(e.target.value)}
          placeholder="Search city, area, street…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
      </form>

      {/* Stub map — no live Maps API */}
      <div className="relative h-52 overflow-hidden rounded-[1.5rem] bg-[#dce8dc] ring-1 ring-forest/10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#9cb89c 1px, transparent 1px), linear-gradient(90deg, #9cb89c 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="h-12 w-12 text-leaf drop-shadow-md" fill="currentColor" aria-hidden />
        </div>
        <button
          type="button"
          onClick={onDetect}
          disabled={detecting}
          aria-label="Detect my location"
          className="absolute right-3 bottom-3 grid h-11 w-11 place-items-center rounded-full bg-white text-forest shadow-md ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-70"
        >
          <LocateFixed
            className={cn("h-5 w-5", detecting && "animate-pulse")}
            aria-hidden
          />
        </button>
      </div>

      <button
        type="button"
        onClick={onDetect}
        disabled={detecting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-mint text-sm font-semibold text-forest ring-1 ring-leaf/25 transition hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-wait disabled:opacity-70"
      >
        <LocateFixed className="h-4.5 w-4.5" aria-hidden />
        {detecting ? "Detecting…" : "Detect my location"}
      </button>

      <div className="rounded-[1.35rem] bg-white p-4 ring-1 ring-forest/10">
        <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Delivering your order to
        </p>
        <p className="mt-1 text-lg font-extrabold text-black">
          {place?.area || "Choose a location"}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          {place?.formatted ||
            "Use Detect my location or search an area. Live map is not connected yet."}
        </p>
        {notice ? (
          <p className="mt-3 text-[13px] font-medium text-forest" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!place}
        className={cn(
          "h-12 w-full rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
          place
            ? "cursor-pointer bg-track text-black shadow-[0_10px_24px_rgba(47,107,47,0.3)] hover:bg-leaf-bright"
            : "cursor-not-allowed bg-black/[0.08] text-muted",
        )}
      >
        Confirm location
      </button>
    </div>
  );
}

function DetailsStep({
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
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? true);
  const [instructions, setInstructions] = useState(
    editing?.instructions ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    if (type === "house") setLabel((l) => l || "Home");
    if (type === "office") setLabel((l) => (l === "Home" || !l ? "Office" : l));
  }, [type, editing]);

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
      isDefault,
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
                onClick={() => setType(t.id)}
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

        {/* Stub mini-map */}
        <div className="relative mt-3 h-28 overflow-hidden rounded-2xl bg-[#dce8dc]">
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
            <MapPin className="h-8 w-8 text-leaf" fill="currentColor" aria-hidden />
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-forest/30 text-leaf accent-leaf"
          />
          <span>
            <span className="block text-sm font-bold text-ink">
              Set as default address
            </span>
            <span className="text-[12px] text-muted">
              Used automatically for Deliver to and checkout.
            </span>
          </span>
        </label>
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
