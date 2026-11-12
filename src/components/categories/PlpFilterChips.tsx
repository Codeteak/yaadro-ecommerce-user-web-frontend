"use client";

import { ArrowUpDown, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PlpSheetKind } from "@/components/categories/PlpFilterSheets";

const chipSecondary =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-white px-3.5 text-[13px] leading-none font-semibold text-leaf ring-1 ring-black/[0.08] transition hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

type PlpFilterChipsProps = {
  open: PlpSheetKind;
  onOpen: (kind: NonNullable<PlpSheetKind>) => void;
  /** Red badge on the green Filter chip when facets are active. */
  filterActive?: boolean;
  className?: string;
};

/**
 * Shared Filter / Brands / Type / Sort pill row — same on `/categories`
 * browser and category PLP (Fruits/Veggies Browse all).
 */
export function PlpFilterChips({
  open,
  onOpen,
  filterActive = false,
  className,
}: PlpFilterChipsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onOpen("filter")}
        aria-expanded={open === "filter"}
        className="relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-track px-3.5 text-[13px] leading-none font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.22)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Filter
        {filterActive ? (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-paper"
            aria-hidden
          />
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onOpen("brands")}
        aria-expanded={open === "brands"}
        className={chipSecondary}
      >
        Brands
        <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onOpen("types")}
        aria-expanded={open === "types"}
        className={chipSecondary}
      >
        Type
        <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onOpen("sort")}
        aria-expanded={open === "sort"}
        className={cn(chipSecondary, "ml-auto gap-1.5 px-3")}
      >
        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
        Sort
      </button>
    </div>
  );
}
