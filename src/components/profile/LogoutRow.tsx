"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LogoutSketchIcon } from "@/components/profile/LogoutSketchIcon";
import { useSignOut } from "@/components/profile/hooks/useSignOut";
import {
  primaryButton,
  secondaryButton,
} from "@/components/profile/profile-styles";

type LogoutRowProps = {
  dryRun?: boolean;
  online?: boolean;
};

/**
 * Centered Logout control + confirm sheet (shop desk profile).
 * Confirm UI unchanged from the original BottomSheet.
 */
export function LogoutRow({ dryRun = false, online = true }: LogoutRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { signOut, pending } = useSignOut({ dryRun });

  return (
    <>
      <div className="flex justify-center pt-2 pb-1">
        <button
          type="button"
          disabled={pending || !online}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full px-4 text-[16px] font-extrabold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogoutSketchIcon className="size-[22px]" />
          {pending ? "Signing out…" : "Logout"}
        </button>
      </div>

      <BottomSheet
        open={confirmOpen}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
        role="alertdialog"
        dismissible={!pending}
        title="Log out?"
        description="You’ll need to sign in again to sync orders, coupons, and wishlist."
      >
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(false)}
            className={`${secondaryButton} flex-1`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !online}
            onClick={() => {
              void signOut();
            }}
            className={`${primaryButton} h-11 flex-1 bg-red-600 text-sm text-white shadow-[0_7px_0_0_#991b1b,0_14px_28px_rgba(185,28,28,0.28)]`}
          >
            {pending ? "Signing out…" : "Log out"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
