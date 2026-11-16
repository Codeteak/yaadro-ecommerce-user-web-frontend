"use client";

import { Check, Navigation, Plus, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatSavedAddressLine,
  type SavedAddress,
} from "@/lib/saved-addresses";

export function AddressListStep({
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
