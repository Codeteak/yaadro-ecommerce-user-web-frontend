"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import {
  formatDeliveryLocationLabel,
  hasBrowseLocation,
  hasDeliveryDetails,
  getDeliveryAddressServerSnapshot,
  readDeliveryAddress,
  subscribeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";
import { getSelectedAddress } from "@/lib/saved-addresses";
import {
  profileCard,
  profileSectionTitle,
} from "@/components/profile/profile-styles";

function formatFullAddress(a: DeliveryAddress): string {
  return [a.house, a.street, a.landmark, a.city, a.pin]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

type ProfileAddressCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Same card language as checkout — opens AddressBookSheet to edit. */
export function ProfileAddressCard({
  open,
  onOpenChange,
}: ProfileAddressCardProps) {
  const address = useSyncExternalStore(
    subscribeDeliveryAddress,
    readDeliveryAddress,
    getDeliveryAddressServerSnapshot,
  );

  const hasLocation = hasBrowseLocation(address);
  const hasDetails = hasDeliveryDetails(address);
  const selected = getSelectedAddress();

  return (
    <section>
      <h2 className={profileSectionTitle}>Delivery address</h2>
      <div className={`mt-3 ${profileCard} p-3.5`}>
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
            {hasDetails && address ? (
              <>
                <p className="truncate text-sm font-bold text-black">
                  {address.house || "Delivery"}
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">
                  {formatFullAddress(address)}
                </p>
              </>
            ) : hasLocation && address ? (
              <>
                <p className="truncate text-sm font-bold text-black">
                  {formatDeliveryLocationLabel(address) || "Location set"}
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">
                  Add house / street details for delivery
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
            onClick={() => onOpenChange(true)}
            className="shrink-0 cursor-pointer text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            {hasDetails ? "Edit" : hasLocation ? "Add details" : "Add"}
          </button>
        </div>
      </div>

      <AddressBookSheet
        open={open}
        onOpenChange={onOpenChange}
        initialStep={hasDetails || selected ? "list" : hasLocation ? "details" : "map"}
        editId={selected?.id ?? null}
      />
    </section>
  );
}
