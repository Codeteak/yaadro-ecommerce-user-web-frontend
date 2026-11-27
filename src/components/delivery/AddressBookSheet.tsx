"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloseButton } from "@/components/navigation/CloseButton";
import { AddressDetailsStep } from "@/components/delivery/AddressDetailsStep";
import { AddressListStep } from "@/components/delivery/AddressListStep";
import { AddressMapStep } from "@/components/delivery/AddressMapStep";
import { showPopup } from "@/components/ui/Toast";
import {
  LOCATION_TOASTS,
  locationToastToneFor,
} from "@/lib/location-messages";
import { hasCustomerSession } from "@/lib/api/session";
import { refreshDeliveryServiceable } from "@/lib/refresh-delivery-serviceable";
import {
  detectMyPlace,
  detectedPlaceFromBrowseLocation,
  detectedPlaceFromSaved,
  getSavedAddress,
  listSavedAddresses,
  saveBrowsePin,
  subscribeSavedAddresses,
  type DetectedPlace,
  type SavedAddress,
} from "@/lib/saved-addresses";
import { syncServerDeliveryAddress } from "@/lib/sync-server-address";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

type Step = "list" | "map" | "details";

type AddressBookSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Start on map (Add) instead of list. */
  initialStep?: Step;
  /** When set, open details prefilled for edit (skips map). */
  editId?: string | null;
  /**
   * Home soft prompt: detect / confirm pin saves location and closes.
   * Address details are collected later at place order.
   */
  pinCompletes?: boolean;
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
 * One saved address → map + Detect → (optional) details form.
 * `pinCompletes` (home prompt): detect/confirm saves pin and closes.
 * Full details are required at checkout place order.
 */
export function AddressBookSheet({
  open,
  onOpenChange,
  initialStep = "list",
  editId = null,
  pinCompletes = false,
}: AddressBookSheetProps) {
  if (!open) return null;
  return (
    <AddressBookSheetBody
      key={`${editId ?? "new"}:${initialStep}:${pinCompletes ? "pin" : "full"}`}
      onOpenChange={onOpenChange}
      initialStep={initialStep}
      editId={editId}
      pinCompletes={pinCompletes}
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
        place: detectedPlaceFromSaved(row),
      };
    }
  }
  // Reopen map with the last Deliver-to / book pin (not an empty map).
  return {
    step: initialStep === "list" && saved.length === 0 ? "map" : initialStep,
    editing: null as SavedAddress | null,
    place: detectedPlaceFromBrowseLocation(),
  };
}

function AddressBookSheetBody({
  onOpenChange,
  initialStep,
  editId,
  pinCompletes,
}: {
  onOpenChange: (open: boolean) => void;
  initialStep: Step;
  editId: string | null;
  pinCompletes: boolean;
}) {
  const [seed] = useState(() => initialDraft(editId, initialStep));
  const [step, setStep] = useState<Step>(seed.step);
  const [draftPlace, setDraftPlace] = useState<DetectedPlace | null>(seed.place);
  const [editing, setEditing] = useState<SavedAddress | null>(seed.editing);
  const [searchQ, setSearchQ] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const [hydratingAddress, setHydratingAddress] = useState(false);

  const raw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const address = (JSON.parse(raw) as SavedAddress[])[0] ?? null;

  // Bug fix: refresh from server every time the sheet opens (not only on login).
  useEffect(() => {
    if (!hasCustomerSession()) return;
    const controller = new AbortController();
    const start = window.setTimeout(() => {
      if (!controller.signal.aborted) setHydratingAddress(true);
    }, 0);
    void syncServerDeliveryAddress(controller.signal)
      .then((delivery) => {
        if (!delivery || controller.signal.aborted) return;
        const saved = listSavedAddresses()[0] ?? null;
        if (saved) {
          setEditing(saved);
          setDraftPlace((prev) => {
            // Keep an in-progress map pick; otherwise restore synced pin.
            if (
              typeof prev?.lat === "number" &&
              typeof prev?.lng === "number"
            ) {
              return prev;
            }
            return detectedPlaceFromSaved(saved);
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setHydratingAddress(false);
      });
    return () => {
      controller.abort();
      window.clearTimeout(start);
    };
    // Mount-only: sheet body remounts each open via parent key.
  }, []);

  // Body only mounts while open — lock for the whole mount lifetime.
  useBodyScrollLock(true);

  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChangeRef.current(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goMap = () => {
    setEditing(null);
    // Seed from current pin so Change location still shows the last spot.
    setDraftPlace(detectedPlaceFromBrowseLocation());
    setMapNotice(null);
    setStep("map");
  };

  const finishWithPin = async (place: DetectedPlace) => {
    saveBrowsePin(place);
    if (typeof place.lat !== "number" || typeof place.lng !== "number") {
      const { message, tone } = LOCATION_TOASTS.pinSaved;
      showPopup(message, tone);
      onOpenChange(false);
      return;
    }
    const serviceable = await refreshDeliveryServiceable(place.lat, place.lng);
    if (serviceable === false) {
      const { message, tone } = LOCATION_TOASTS.notServiceable;
      showPopup(message, tone);
    } else if (serviceable === true) {
      const { message, tone } = LOCATION_TOASTS.pinSaved;
      showPopup(message, tone);
    } else {
      const { message, tone } = LOCATION_TOASTS.checkFailed;
      showPopup(message, tone);
    }
    onOpenChange(false);
  };

  const onDetect = async () => {
    setDetecting(true);
    setMapNotice(null);
    const result = await detectMyPlace();
    setDetecting(false);
    if (!result.ok) {
      setMapNotice(result.message);
      showPopup(result.message, locationToastToneFor(result.message));
      return;
    }
    setDraftPlace(result.place);
    if (pinCompletes) {
      await finishWithPin(result.place);
      return;
    }
    const found = LOCATION_TOASTS.locationFound;
    setMapNotice(found.message);
    showPopup(found.message, found.tone);
  };

  const onConfirmMap = () => {
    if (!draftPlace) {
      const { message, tone } = LOCATION_TOASTS.pickOnMap;
      setMapNotice(message);
      showPopup(message, tone);
      return;
    }
    if (pinCompletes) {
      void finishWithPin(draftPlace);
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
          {/* Close only — no back on map or Location details. */}
          <span className="size-11 shrink-0" aria-hidden />
          <h2 className="min-w-0 flex-1 text-center text-lg font-extrabold text-black">
            {title}
          </h2>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {step === "list" && hydratingAddress && !address ? (
            <p className="py-8 text-center text-sm font-medium text-muted" role="status">
              Loading your saved address…
            </p>
          ) : null}
          {step === "list" && address ? (
            <AddressListStep address={address} onChange={goMap} />
          ) : null}
          {step === "list" && !address && !hydratingAddress ? (
            <p className="py-6 text-center text-sm text-muted">
              No address yet — add one on the map.
            </p>
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
              onSelectPlace={(next) => {
                setDraftPlace(next);
                setMapNotice(
                  pinCompletes
                    ? "Area set — use this location to continue shopping."
                    : "Area set — confirm location to continue.",
                );
              }}
              onConfirm={onConfirmMap}
              onPlaceFromMap={setDraftPlace}
              onResolving={setResolving}
              onNotice={setMapNotice}
              confirmLabel={
                pinCompletes ? "Use this location" : "Confirm location"
              }
            />
          ) : null}
          {step === "details" && draftPlace ? (
            <AddressDetailsStep
              place={draftPlace}
              editing={editing}
              detecting={detecting}
              onDetect={onDetect}
              onPlaceChange={setDraftPlace}
              onSaved={() => {
                const { message, tone } = LOCATION_TOASTS.addressSaved;
                showPopup(message, tone);
                onOpenChange(false);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
