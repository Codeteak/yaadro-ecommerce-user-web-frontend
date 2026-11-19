"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";
import {
  formatDeliveryAddressLabel,
  readDeliveryAddress,
  subscribeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";

function formatFullAddress(a: DeliveryAddress): string {
  return [a.house, a.street, a.landmark, a.city, a.pin]
    .filter(Boolean)
    .join(", ");
}
import {
  formatSavedAddressLine,
  listSavedAddresses,
  subscribeSavedAddresses,
  type SavedAddress,
  upsertSavedAddress,
} from "@/lib/saved-addresses";

function subscribeSaved(onChange: () => void) {
  return subscribeSavedAddresses(onChange);
}

function savedSnapshot() {
  return JSON.stringify(listSavedAddresses());
}

/**
 * Phase C #31 + #35 playground — one AddressBookSheet for:
 * - Profile: add/edit in a modal (no dedicated page)
 * - Checkout: Edit/Add opens the same sheet; Edit passes editId
 */
export function PhaseCAddressModalDemo() {
  const savedRaw = useSyncExternalStore(
    subscribeSaved,
    savedSnapshot,
    () => "[]",
  );
  const saved = (JSON.parse(savedRaw) as SavedAddress[])[0] ?? null;

  const deliveryRaw = useSyncExternalStore(
    subscribeDeliveryAddress,
    () => JSON.stringify(readDeliveryAddress()),
    () => "null",
  );
  const delivery = useMemo((): DeliveryAddress | null => {
    if (deliveryRaw === "null") return null;
    try {
      return JSON.parse(deliveryRaw) as DeliveryAddress;
    } catch {
      return null;
    }
  }, [deliveryRaw]);

  const hasDelivery =
    delivery != null && formatDeliveryAddressLabel(delivery).trim().length > 0;

  const [checkoutSheetOpen, setCheckoutSheetOpen] = useState(false);
  const [checkoutEditId, setCheckoutEditId] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"list" | "map" | "details">(
    "list",
  );

  const openCheckoutAdd = () => {
    setCheckoutEditId(null);
    setCheckoutStep("map");
    setCheckoutSheetOpen(true);
  };

  const openCheckoutEdit = () => {
    if (saved) {
      setCheckoutEditId(saved.id);
      setCheckoutStep("details");
    } else {
      setCheckoutEditId(null);
      setCheckoutStep("map");
    }
    setCheckoutSheetOpen(true);
  };

  const seedSample = () => {
    upsertSavedAddress({
      label: "Home",
      type: "house",
      building: "12A Green Residency",
      street: "MG Road",
      area: "Indiranagar",
      city: "Bengaluru",
      pin: "560038",
      landmark: "Near metro",
      instructions: "Ring bell twice",
      isDefault: true,
    });
  };

  return (
    <div className="space-y-8 bg-paper px-4 py-6">
      <div>
        <p className="text-[13px] font-semibold text-forest">
          Phase C · #31 + #35
        </p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Shared <code className="text-ink">AddressBookSheet</code> modal for
          add and edit. No dedicated address page. Checkout Edit must pass{" "}
          <code className="text-ink">editId</code> (live still opens list only).
        </p>
        {!saved ? (
          <button
            type="button"
            onClick={seedSample}
            className="mt-3 h-10 rounded-full bg-mint px-4 text-sm font-semibold text-forest transition hover:bg-leaf/20"
          >
            Seed sample address
          </button>
        ) : null}
      </div>

      {/* #31 — profile: modal manage, not a route */}
      <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-black/[0.06]">
        <h3 className="text-sm font-extrabold text-black">
          Profile · Address (#31)
        </h3>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          Manage inline. Add / Edit / Delete open the sheet — no{" "}
          <code className="text-ink">/profile/addresses</code> page.
        </p>
        {saved ? (
          <p className="mt-2 truncate text-[12px] text-muted">
            Saved: {saved.label} · {formatSavedAddressLine(saved)}
          </p>
        ) : null}
        <SavedAddressesManageList className="mt-4" />
      </section>

      {/* #35 — checkout: Edit with editId */}
      <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-black/[0.06]">
        <h3 className="text-sm font-extrabold text-black">
          Checkout · Delivery Address (#35)
        </h3>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          Same sheet. <strong className="font-semibold text-ink">Edit</strong>{" "}
          opens details with <code className="text-ink">editId</code>;{" "}
          <strong className="font-semibold text-ink">Add</strong> starts on map.
        </p>

        <div className="mt-4 rounded-2xl bg-paper p-3.5 ring-1 ring-forest/10">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint">
              <Image
                src="/icons/location.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8"
                unoptimized
              />
            </span>
            <div className="min-w-0 flex-1">
              {hasDelivery && delivery ? (
                <>
                  <p className="truncate text-sm font-bold text-black">
                    {delivery.house || "Delivery"}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">
                    {formatFullAddress(delivery)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-muted">
                  Add a delivery address
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={hasDelivery ? openCheckoutEdit : openCheckoutAdd}
              className="shrink-0 text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              {hasDelivery ? "Edit" : "Add"}
            </button>
          </div>
        </div>

        <AddressBookSheet
          open={checkoutSheetOpen}
          onOpenChange={(next) => {
            setCheckoutSheetOpen(next);
            if (!next) setCheckoutEditId(null);
          }}
          initialStep={checkoutStep}
          editId={checkoutEditId}
        />
      </section>
    </div>
  );
}
