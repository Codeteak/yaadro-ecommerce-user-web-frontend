"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BackButton } from "@/components/navigation/BackButton";
import { CloseButton } from "@/components/navigation/CloseButton";
import { AddressDetailsStep } from "@/components/delivery/AddressDetailsStep";
import { AddressListStep } from "@/components/delivery/AddressListStep";
import { AddressMapStep } from "@/components/delivery/AddressMapStep";
import {
  detectMyPlace,
  formatSavedAddressLine,
  geocodeSearchQuery,
  getSavedAddress,
  listSavedAddresses,
  subscribeSavedAddresses,
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
  return JSON.stringify(listSavedAddresses());
}

function getServerSnapshot() {
  return "[]";
}

/**
 * One saved address → map + Detect → details form.
 * Saving syncs checkout delivery localStorage.
 * The body mounts only while open, so each open starts from a clean step.
 */
export function AddressBookSheet({
  open,
  onOpenChange,
  initialStep = "list",
  editId = null,
}: AddressBookSheetProps) {
  if (!open) return null;
  return (
    <AddressBookSheetBody
      key={`${editId ?? "new"}:${initialStep}`}
      onOpenChange={onOpenChange}
      initialStep={initialStep}
      editId={editId}
    />
  );
}

function initialDraft(editId: string | null, initialStep: Step) {
  const saved = listSavedAddresses();
  if (editId) {
    const row = getSavedAddress(editId);
    if (row) {
      return {
        step: "details" as const,
        editing: row,
        place: {
          area: row.area,
          street: row.street,
          city: row.city,
          pin: row.pin,
          landmark: row.landmark,
          lat: row.lat,
          lng: row.lng,
          formatted: formatSavedAddressLine(row),
        } satisfies DetectedPlace,
      };
    }
  }
  return {
    step: initialStep === "list" && saved.length === 0 ? "map" : initialStep,
    editing: null as SavedAddress | null,
    place: null as DetectedPlace | null,
  };
}

function AddressBookSheetBody({
  onOpenChange,
  initialStep,
  editId,
}: {
  onOpenChange: (open: boolean) => void;
  initialStep: Step;
  editId: string | null;
}) {
  const [seed] = useState(() => initialDraft(editId, initialStep));
  const [step, setStep] = useState<Step>(seed.step);
  const [draftPlace, setDraftPlace] = useState<DetectedPlace | null>(seed.place);
  const [editing, setEditing] = useState<SavedAddress | null>(seed.editing);
  const [searchQ, setSearchQ] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  const raw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const address = (JSON.parse(raw) as SavedAddress[])[0] ?? null;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onOpenChange]);

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
          {step === "details" ? (
            <BackButton onClick={() => setStep("map")} />
          ) : (
            <span className="size-11 shrink-0" aria-hidden />
          )}
          <h2 className="min-w-0 flex-1 text-center text-lg font-extrabold text-black">
            {title}
          </h2>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {step === "list" && address ? (
            <AddressListStep address={address} onChange={goMap} />
          ) : null}
          {step === "map" ? (
            <AddressMapStep
              searchQ={searchQ}
              onSearchQ={setSearchQ}
              place={draftPlace}
              detecting={detecting}
              resolving={resolving}
              notice={mapNotice}
              onDetect={onDetect}
              onUseSearch={async () => {
                setResolving(true);
                setMapNotice(null);
                const result = await geocodeSearchQuery(searchQ);
                setResolving(false);
                if (!result.ok) {
                  setMapNotice(result.message);
                  return;
                }
                setDraftPlace(result.place);
                setMapNotice("Area set — confirm location to continue.");
              }}
              onConfirm={onConfirmMap}
              onPlaceFromMap={setDraftPlace}
              onResolving={setResolving}
              onNotice={setMapNotice}
            />
          ) : null}
          {step === "details" && draftPlace ? (
            <AddressDetailsStep
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
