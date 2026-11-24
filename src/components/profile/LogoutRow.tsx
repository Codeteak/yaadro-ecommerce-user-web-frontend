"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSignOut } from "@/components/profile/hooks/useSignOut";
import {
  primaryButton,
  profileCard,
  secondaryButton,
} from "@/components/profile/profile-styles";

type LogoutRowProps = {
  dryRun?: boolean;
  online?: boolean;
};

/** Red log-out row with confirm sheet. Disabled while offline. */
export function LogoutRow({ dryRun = false, online = true }: LogoutRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { signOut, pending } = useSignOut({ dryRun });

  return (
    <>
      <div className={`${profileCard} overflow-hidden`}>
        <button
          type="button"
          disabled={pending || !online}
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50">
            <LogOut aria-hidden className="size-5 text-red-500" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-red-600">
              {pending ? "Signing out…" : "Log out"}
            </span>
            <span className="mt-0.5 block text-[13px] leading-5 text-muted">
              {online
                ? "Clear this account from this phone"
                : "Connect to the internet to sign out"}
            </span>
          </span>
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
