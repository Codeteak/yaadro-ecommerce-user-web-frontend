"use client";

import {
  AddressDetectButton,
  AddressSearchField,
} from "@/components/delivery/AddressLocationControls";
import { AddressLocationMap } from "@/components/delivery/AddressLocationMap";
import { cn } from "@/lib/cn";
import type { DetectedPlace } from "@/lib/saved-addresses";

export function AddressMapStep({
  searchQ,
  onSearchQ,
  place,
  detecting,
  resolving,
  notice,
  onDetect,
  onSelectPlace,
  onConfirm,
  onPlaceFromMap,
  onResolving,
  onNotice,
  confirmLabel = "Confirm location",
}: {
  searchQ: string;
  onSearchQ: (v: string) => void;
  place: DetectedPlace | null;
  detecting: boolean;
  resolving: boolean;
  notice: string | null;
  onDetect: () => void;
  onSelectPlace: (place: DetectedPlace) => void;
  onConfirm: () => void;
  onPlaceFromMap: (place: DetectedPlace) => void;
  onResolving: (busy: boolean) => void;
  onNotice: (message: string | null) => void;
  confirmLabel?: string;
}) {
  const busy = detecting || resolving;

  return (
    <div className="flex flex-col gap-3.5 pb-4">
      <AddressSearchField
        value={searchQ}
        onChange={onSearchQ}
        onSelectPlace={onSelectPlace}
        disabled={busy}
      />

      <div className="overflow-hidden rounded-2xl ring-1 ring-forest/10 shadow-[0_8px_24px_rgba(47,107,47,0.08)]">
        <AddressLocationMap
          place={place}
          resolving={resolving}
          onResolving={onResolving}
          onPlace={onPlaceFromMap}
          onNotice={onNotice}
        />
      </div>

      <AddressDetectButton
        detecting={detecting}
        disabled={resolving}
        onDetect={onDetect}
      />

      <div className="rounded-[1.35rem] bg-white p-4 shadow-[0_4px_14px_rgba(47,107,47,0.06)] ring-1 ring-forest/10">
        <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Delivering your order to
        </p>
        <p className="mt-1 text-lg font-extrabold text-black">
          {place?.area || "Choose a location"}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          {place?.formatted ||
            "Search an area, tap the map, or detect your location."}
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
        disabled={!place || busy}
        className={cn(
          "h-12 w-full rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
          place && !busy
            ? "cursor-pointer bg-track text-black shadow-[0_10px_24px_rgba(47,107,47,0.3)] hover:bg-leaf-bright"
            : "cursor-not-allowed bg-black/[0.08] text-muted",
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
