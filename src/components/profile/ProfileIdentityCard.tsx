"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { PhoneChangeSheet } from "@/components/profile/PhoneChangeSheet";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileNameForm } from "@/components/profile/ProfileNameForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatIndianMobile } from "@/lib/profile-validation";
import {
  primaryButton,
  profileCard,
  profileSectionTitle,
  secondaryButton,
} from "@/components/profile/profile-styles";

type ProfileIdentityCardProps = {
  displayName: string | null;
  phone: string | null;
  userId: string | null;
  online: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  dryRun?: boolean;
};

/**
 * Avatar + full name + phone. Edit toggles an inline name form;
 * phone opens the OTP sheet.
 */
export function ProfileIdentityCard({
  displayName,
  phone,
  online,
  editing,
  onEditingChange,
  dryRun = false,
}: ProfileIdentityCardProps) {
  const [dirtyAsk, setDirtyAsk] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);

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

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className={profileSectionTitle}>Your details</h2>
        {!editing ? (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <Pencil aria-hidden className="size-3.5" strokeWidth={2.4} />
            Edit
          </button>
        ) : null}
      </div>

      <div className={`mt-3 ${profileCard} p-4`}>
        {editing ? (
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
        ) : (
          <div className="flex items-start gap-3">
            <ProfileAvatar name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              {displayName ? (
                <p className="truncate text-sm font-bold text-black">{displayName}</p>
              ) : (
                <button
                  type="button"
                  onClick={openEdit}
                  className="text-sm font-bold text-leaf"
                >
                  Add your name
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhoneOpen(true)}
                className="mt-1 block text-left text-[13px] leading-5 font-semibold text-muted transition hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                {phoneLabel}
                <span className="ml-1.5 text-leaf">Change</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <PhoneChangeSheet
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        currentPhone={phone}
        online={online}
      />

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
    </section>
  );
}
