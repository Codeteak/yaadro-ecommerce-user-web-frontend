"use client";

import { LocateFixed, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DetectedPlace } from "@/lib/saved-addresses";

export function AddressMapStep({
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
