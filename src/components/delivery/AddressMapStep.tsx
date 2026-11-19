"use client";

import { LocateFixed, Search } from "lucide-react";
import {
  AddressLocateButton,
  AddressLocationMap,
} from "@/components/delivery/AddressLocationMap";
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
  onUseSearch,
  onConfirm,
  onPlaceFromMap,
  onResolving,
  onNotice,
}: {
  searchQ: string;
  onSearchQ: (v: string) => void;
  place: DetectedPlace | null;
  detecting: boolean;
  resolving: boolean;
  notice: string | null;
  onDetect: () => void;
  onUseSearch: () => void;
  onConfirm: () => void;
  onPlaceFromMap: (place: DetectedPlace) => void;
  onResolving: (busy: boolean) => void;
  onNotice: (message: string | null) => void;
}) {
  const busy = detecting || resolving;

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

      <div className="relative">
        <AddressLocationMap
          place={place}
          resolving={resolving}
          onResolving={onResolving}
          onPlace={onPlaceFromMap}
          onNotice={onNotice}
        />
        <AddressLocateButton
          detecting={detecting}
          onDetect={onDetect}
          className="absolute right-3 bottom-3 z-[2]"
        />
      </div>

      <button
        type="button"
        onClick={onDetect}
        disabled={busy}
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
            "Tap the map, drag the pin, search an area, or detect your location."}
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
        Confirm location
      </button>
    </div>
  );
}
