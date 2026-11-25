"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { PhoneChangeSheet } from "@/components/profile/PhoneChangeSheet";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileNameForm } from "@/components/profile/ProfileNameForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { GUEST_PROFILE_AVATAR } from "@/lib/default-profile-avatar";
import {
  formatDeliveryLocationLabel,
  getDeliveryAddressServerSnapshot,
  hasBrowseLocation,
  hasDeliveryDetails,
  readDeliveryAddress,
  subscribeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";
import { getSelectedAddress } from "@/lib/saved-addresses";
import { loginHref } from "@/lib/profile-options";
import { formatIndianMobile } from "@/lib/profile-validation";
import {
  primaryButton,
  secondaryButton,
} from "@/components/profile/profile-styles";

function formatFullAddress(a: DeliveryAddress): string {
  return [a.house, a.street, a.landmark, a.city, a.pin]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Guest desk hero — wash + sign-in strip. */
export function ProfileDeskGuestCard() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_10px_28px_rgba(31,92,31,0.1)] ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-3.5 bg-gradient-to-b from-mint to-white px-4 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[24px] leading-tight font-extrabold tracking-tight text-black">
            Guest
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Browse now — sync when ready
          </p>
          <Link
            href={loginHref("/profile")}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-track px-4 text-[13px] font-extrabold text-black shadow-[0_3px_0_0_#1f5c1f] transition active:translate-y-px active:shadow-[0_2px_0_0_#1f5c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Sign in
          </Link>
        </div>
        <Image
          src={GUEST_PROFILE_AVATAR}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-20 shrink-0 rounded-full object-cover ring-[3px] ring-white shadow-sm"
        />
      </div>
    </div>
  );
}

type ProfileDeskSignedCardProps = {
  displayName: string | null;
  phone: string | null;
  userId: string | null;
  online: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  addressOpen: boolean;
  onAddressOpenChange: (open: boolean) => void;
  dryRun?: boolean;
};

/** Signed-in desk hero — soft wash, large avatar, identity, deliver-to. */
export function ProfileDeskSignedCard({
  displayName,
  phone,
  userId,
  online,
  editing,
  onEditingChange,
  addressOpen,
  onAddressOpenChange,
  dryRun = false,
}: ProfileDeskSignedCardProps) {
  const [dirtyAsk, setDirtyAsk] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);

  const address = useSyncExternalStore(
    subscribeDeliveryAddress,
    readDeliveryAddress,
    getDeliveryAddressServerSnapshot,
  );
  const hasLocation = hasBrowseLocation(address);
  const hasDetails = hasDeliveryDetails(address);
  const selected = getSelectedAddress();

  const openEdit = () => {
    setNameDirty(false);
    onEditingChange(true);
  };
  const closeEdit = () => {
    setNameDirty(false);
    onEditingChange(false);
  };
  const requestCloseEdit = () => {
    if (nameDirty) {
      setDirtyAsk(true);
      return;
    }
    closeEdit();
  };

  const phoneLabel = formatIndianMobile(phone) ?? phone ?? "Add mobile number";
  const deliverLabel =
    hasDetails && address
      ? formatFullAddress(address)
      : hasLocation && address
        ? formatDeliveryLocationLabel(address) || "Location set"
        : "Add a delivery address";

  return (
    <>
      <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_10px_28px_rgba(31,92,31,0.1)] ring-1 ring-black/[0.05]">
        <div className="bg-gradient-to-b from-mint to-white px-4 pt-5 pb-3">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-1">
              {displayName ? (
                <p className="truncate text-[24px] leading-tight font-extrabold tracking-tight text-black">
                  {displayName}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={openEdit}
                  className="text-[24px] leading-tight font-extrabold tracking-tight text-leaf"
                >
                  Add your name
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhoneOpen(true)}
                className="mt-1 block text-left text-[13px] font-semibold tabular-nums text-muted transition hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                {phoneLabel}
                <span className="ml-1.5 text-leaf">Change</span>
              </button>
              <button
                type="button"
                onClick={openEdit}
                className="mt-2 inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-forest transition hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <Pencil className="size-3" strokeWidth={2.4} aria-hidden />
                Edit
              </button>
            </div>
            <span className="inline-flex shrink-0 rounded-full ring-[3px] ring-white shadow-sm">
              <ProfileAvatar
                name={displayName}
                seed={userId}
                size="md"
                className="size-[88px]"
              />
            </span>
          </div>
        </div>

        <div className="px-4 pb-3.5">
          <button
            type="button"
            onClick={() => onAddressOpenChange(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#F4F7F4] px-3 py-2.5 text-left transition hover:bg-[#EAF0EA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-black/[0.04]">
              <Image
                src="/icons/location.svg"
                alt=""
                width={18}
                height={18}
                unoptimized
                className="h-[18px] w-[18px]"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold tracking-wide text-muted uppercase">
                Deliver to
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-bold text-black">
                {deliverLabel}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted/70" aria-hidden />
          </button>
        </div>
      </div>

      <AddressBookSheet
        open={addressOpen}
        onOpenChange={onAddressOpenChange}
        initialStep={hasDetails || selected ? "list" : hasLocation ? "details" : "map"}
        editId={selected?.id ?? null}
      />

      <PhoneChangeSheet
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        currentPhone={phone}
        online={online}
      />

      <BottomSheet
        open={editing}
        onClose={requestCloseEdit}
        title="Edit name"
        description="This name shows on your profile and orders."
      >
        <div
          onChange={() => setNameDirty(true)}
          onInput={() => setNameDirty(true)}
        >
          <ProfileNameForm
            currentName={displayName}
            online={online}
            dryRun={dryRun}
            onDone={closeEdit}
            onCancel={requestCloseEdit}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={dirtyAsk}
        onClose={() => setDirtyAsk(false)}
        role="alertdialog"
        title="Discard changes?"
        description="Your name edits won’t be saved."
      >
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDirtyAsk(false)}
            className={`${secondaryButton} flex-1`}
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => {
              setDirtyAsk(false);
              closeEdit();
            }}
            className={`${primaryButton} h-11 flex-1 text-sm`}
          >
            Discard
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
