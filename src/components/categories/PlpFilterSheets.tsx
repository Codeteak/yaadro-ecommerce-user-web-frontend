"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { CloseButton } from "@/components/navigation/CloseButton";
import { cn } from "@/lib/cn";
import {
  DEFAULT_PLP_FILTERS,
  PLP_SORT_OPTIONS,
  type PlpFilterState,
  type PlpSortId,
} from "@/lib/plp-filters";

export type PlpSheetKind = "filter" | "brands" | "types" | "sort" | null;

type PlpFilterSheetsProps = {
  open: PlpSheetKind;
  onClose: () => void;
  value: PlpFilterState;
  onChange: (next: PlpFilterState) => void;
  brandOptions: string[];
  typeOptions: string[];
};

/**
 * Bottom sheets for PLP Filter / Brands / Type / Sort chips.
 */
export function PlpFilterSheets({
  open,
  onClose,
  value,
  onChange,
  brandOptions,
  typeOptions,
}: PlpFilterSheetsProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const title =
    open === "filter"
      ? "Filters"
      : open === "brands"
        ? "Brands"
        : open === "types"
          ? "Type"
          : "Sort";

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
      />
      <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto flex max-h-[78dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-paper shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-forest/15" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">
            {title}
          </h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {open === "filter" ? (
            <FilterBody value={value} onChange={onChange} />
          ) : null}
          {open === "brands" ? (
            <MultiSelectBody
              options={brandOptions}
              selected={value.brands}
              empty="No brands in this category."
              onToggle={(brand) =>
                onChange({
                  ...value,
                  brands: toggleInList(value.brands, brand),
                })
              }
            />
          ) : null}
          {open === "types" ? (
            <MultiSelectBody
              options={typeOptions}
              selected={value.types}
              empty="No types in this category."
              onToggle={(type) =>
                onChange({
                  ...value,
                  types: toggleInList(value.types, type),
                })
              }
            />
          ) : null}
          {open === "sort" ? (
            <SortBody
              sort={value.sort}
              onSelect={(sort) => onChange({ ...value, sort })}
            />
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-black/[0.06] px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {open !== "sort" ? (
            <button
              type="button"
              onClick={() => {
                if (open === "filter") {
                  onChange({
                    ...value,
                    onOffer: false,
                    byWeight: false,
                    bestSeller: false,
                  });
                } else if (open === "brands") {
                  onChange({ ...value, brands: [] });
                } else if (open === "types") {
                  onChange({ ...value, types: [] });
                }
              }}
              className="h-12 flex-1 cursor-pointer rounded-full bg-white text-sm font-semibold text-leaf ring-1 ring-black/[0.08] transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChange({ ...value, sort: DEFAULT_PLP_FILTERS.sort })}
              className="h-12 flex-1 cursor-pointer rounded-full bg-white text-sm font-semibold text-leaf ring-1 ring-black/[0.08] transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-[1.4] cursor-pointer rounded-full bg-track text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function toggleInList(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function FilterBody({
  value,
  onChange,
}: {
  value: PlpFilterState;
  onChange: (next: PlpFilterState) => void;
}) {
  const rows: {
    key: "onOffer" | "byWeight" | "bestSeller";
    label: string;
    hint: string;
  }[] = [
    { key: "onOffer", label: "On offer", hint: "Price below MRP" },
    { key: "byWeight", label: "Sold by weight", hint: "Loose produce" },
    { key: "bestSeller", label: "Best sellers", hint: "Marked Best Seller" },
  ];

  return (
    <ul className="divide-y divide-forest/8">
      {rows.map((row) => {
        const on = value[row.key];
        return (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onChange({ ...value, [row.key]: !on })}
              className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {row.hint}
                </span>
              </span>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-md ring-1 transition",
                  on
                    ? "bg-track text-black ring-track"
                    : "bg-white text-transparent ring-black/15",
                )}
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MultiSelectBody({
  options,
  selected,
  empty,
  onToggle,
}: {
  options: string[];
  selected: string[];
  empty: string;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-forest/8">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <li key={opt}>
            <button
              type="button"
              onClick={() => onToggle(opt)}
              className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
            >
              <span className="min-w-0 flex-1 text-[15px] font-bold text-ink">
                {opt}
              </span>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-md ring-1 transition",
                  on
                    ? "bg-track text-black ring-track"
                    : "bg-white text-transparent ring-black/15",
                )}
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SortBody({
  sort,
  onSelect,
}: {
  sort: PlpSortId;
  onSelect: (id: PlpSortId) => void;
}) {
  return (
    <ul className="divide-y divide-forest/8">
      {PLP_SORT_OPTIONS.map((opt) => {
        const on = sort === opt.id;
        return (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => onSelect(opt.id)}
              className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 text-[15px] font-bold",
                  on ? "text-leaf" : "text-ink",
                )}
              >
                {opt.label}
              </span>
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full ring-2 transition",
                  on ? "ring-leaf" : "ring-black/15",
                )}
                aria-hidden
              >
                {on ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-track" />
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
