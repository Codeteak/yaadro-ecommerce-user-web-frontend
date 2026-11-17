"use client";

import { Navigation } from "lucide-react";
import {
  formatSavedAddressLine,
  type SavedAddress,
} from "@/lib/saved-addresses";

export function AddressListStep({
  address,
  onChange,
}: {
  address: SavedAddress;
  onChange: () => void;
}) {
  return (
    <div className="pb-4">
      <p className="text-[13px] leading-5 text-muted">
        This is the address we deliver to.
      </p>
      <div className="mt-4 flex items-center gap-3 rounded-[1.5rem] bg-track p-3.5 shadow-[0_8px_22px_rgba(47,107,47,0.1)]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-forest shadow-sm">
          <Navigation className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold text-black">
            {address.label}
          </span>
          <span className="mt-1 block text-[13px] leading-5 text-black/70">
            {formatSavedAddressLine(address)}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="mt-3 h-12 w-full rounded-full bg-white text-sm font-extrabold text-forest ring-1 ring-leaf/40 transition hover:bg-mint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        Change address
      </button>
    </div>
  );
}
