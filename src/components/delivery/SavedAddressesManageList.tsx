"use client";

import { useState, useSyncExternalStore } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { cn } from "@/lib/cn";
import {
  deleteSavedAddress,
  formatSavedAddressLine,
  listSavedAddresses,
  setDefaultSavedAddress,
  subscribeSavedAddresses,
  type SavedAddress,
} from "@/lib/saved-addresses";

function subscribe(onChange: () => void) {
  return subscribeSavedAddresses(onChange);
}

function getSnapshot() {
  return JSON.stringify(listSavedAddresses());
}

/**
 * Profile-style address management list: pin, label, Default, star / edit /
 * delete, Add New Address. Yaadro theme. Playground first.
 */
export function SavedAddressesManageList({
  className,
}: {
  className?: string;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const list = JSON.parse(raw) as SavedAddress[];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<"list" | "map" | "details">("map");
  const [editId, setEditId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);

  const openAdd = () => {
    setEditId(null);
    setSheetStep("map");
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setSheetStep("details");
    setSheetOpen(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <ul className="flex flex-col gap-3">
        {list.map((addr) => (
          <li
            key={addr.id}
            className="rounded-[1.35rem] bg-white p-3.5 shadow-[0_6px_18px_rgba(47,107,47,0.08)] ring-1 ring-black/[0.06]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-black">
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[15px] font-extrabold text-black">
                    {addr.label}
                    {addr.isDefault ? (
                      <span className="ml-2 text-[13px] font-semibold text-muted">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setDefaultSavedAddress(addr.id)}
                      aria-label={
                        addr.isDefault
                          ? `${addr.label} is default`
                          : `Set ${addr.label} as default`
                      }
                      className="grid h-9 w-9 place-items-center rounded-full text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      <Star
                        className={cn(
                          "h-[18px] w-[18px]",
                          addr.isDefault
                            ? "fill-amber-400 text-amber-400"
                            : "text-forest/50",
                        )}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(addr.id)}
                      aria-label={`Edit ${addr.label}`}
                      className="grid h-9 w-9 place-items-center rounded-full text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      <Pencil className="h-[17px] w-[17px]" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(addr)}
                      aria-label={`Delete ${addr.label}`}
                      className="grid h-9 w-9 place-items-center rounded-full text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      <Trash2 className="h-[17px] w-[17px]" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[13px] leading-5 text-muted">
                  {formatSavedAddressLine(addr)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {list.length === 0 ? (
        <p className="mb-3 text-center text-sm text-muted">
          No saved addresses yet.
        </p>
      ) : null}

      <button
        type="button"
        onClick={openAdd}
        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] border border-dashed border-leaf/50 bg-white text-sm font-extrabold text-forest transition hover:border-leaf hover:bg-mint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Add New Address
      </button>

      <AddressBookSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) setEditId(null);
        }}
        initialStep={sheetStep}
        editId={editId}
      />

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-addr-title"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-track/45 backdrop-blur-[2px]"
            onClick={() => setPendingDelete(null)}
          />
          <div className="relative mx-4 mb-[max(1.25rem,env(safe-area-inset-bottom))] w-full max-w-sm rounded-[1.5rem] bg-paper p-5 shadow-[0_24px_48px_rgba(47,107,47,0.28)]">
            <h2
              id="delete-addr-title"
              className="text-lg font-extrabold text-black"
            >
              Delete {pendingDelete.label}?
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-muted">
              This removes the address from this device. You can add it again
              later.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-11 flex-1 rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSavedAddress(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="h-11 flex-1 rounded-full bg-track text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
