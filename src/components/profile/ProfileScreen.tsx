"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { LogoutRow } from "@/components/profile/LogoutRow";
import { ProfileAddressCard } from "@/components/profile/ProfileAddressCard";
import { ProfileGuestCard } from "@/components/profile/ProfileGuestCard";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfileOptionsList } from "@/components/profile/ProfileOptionsList";
import {
  useMyProfile,
  type ProfilePreview,
} from "@/components/profile/hooks/useMyProfile";
import { ProfileScreenSkeleton } from "@/components/ui/skeletons";
import { secondaryButton } from "@/components/profile/profile-styles";
import { cn } from "@/lib/cn";

export type ProfileScreenProps = {
  /** Playground: skip live session / API. */
  preview?: ProfilePreview;
  backHref?: string;
  /** Playground: name save + logout toast only. */
  dryRun?: boolean;
  className?: string;
  /** Hide sticky page chrome when embedded in a demo frame. */
  hideHeader?: boolean;
};

/**
 * Open edit / address from `?edit=1` / `?address=1` once, then strip the query.
 * A ref prevents replace+searchParams churn from looping (React #185).
 */
function ProfileDeepLinks({
  onEdit,
  onAddress,
}: {
  onEdit: () => void;
  onAddress: () => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const consumed = useRef(false);
  const onEditRef = useRef(onEdit);
  const onAddressRef = useRef(onAddress);

  useEffect(() => {
    onEditRef.current = onEdit;
    onAddressRef.current = onAddress;
  }, [onEdit, onAddress]);

  useEffect(() => {
    if (consumed.current) return;
    const edit = searchParams.get("edit") === "1";
    const address = searchParams.get("address") === "1";
    if (!edit && !address) return;

    consumed.current = true;
    if (edit) onEditRef.current();
    if (address) onAddressRef.current();
    if (pathname) router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}

/**
 * Live `/profile` body — identity, address, stacked options, logout.
 * Guest: sign-in card + Wishlist/Help open; other rows lock to login.
 */
export function ProfileScreen({
  preview,
  backHref = "/home",
  dryRun = false,
  className,
  hideHeader = false,
}: ProfileScreenProps) {
  const me = useMyProfile(preview);
  const [editing, setEditing] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  const onEdit = useCallback(() => setEditing(true), []);
  const onAddress = useCallback(() => setAddressOpen(true), []);

  const showSkeleton =
    me.status === "auth-loading" ||
    (me.status === "loading" && !me.displayName);

  return (
    <main
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        "min-h-[calc(100dvh-var(--storefront-nav-clearance,5.5rem))]",
        className,
      )}
    >
      {!hideHeader ? <PageHeader backHref={backHref} title="Profile" /> : null}

      {!preview ? (
        <Suspense fallback={null}>
          <ProfileDeepLinks onEdit={onEdit} onAddress={onAddress} />
        </Suspense>
      ) : null}

      {!me.online ? (
        <p
          role="status"
          className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-200/80"
        >
          You&apos;re offline. Changes will be available when you reconnect.
        </p>
      ) : null}

      {showSkeleton ? (
        <ProfileScreenSkeleton className="mt-4" />
      ) : (
        <div className="flex flex-1 flex-col gap-6 pt-3 pb-10">
          {me.status === "guest" ? (
            <ProfileGuestCard />
          ) : (
            <>
              {(me.status === "error" || me.status === "offline") &&
              !me.profile &&
              !me.displayName ? (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-forest/10 shadow-[0_8px_24px_rgba(47,107,47,0.1)]">
                  <p className="text-sm font-bold text-black">
                    We couldn&apos;t load your profile.
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-muted">
                    {me.errorMessage ??
                      "Check your connection and try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => me.refetch()}
                    disabled={!me.online}
                    className={`${secondaryButton} mt-4`}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <ProfileIdentityCard
                  displayName={me.displayName}
                  phone={me.phone}
                  userId={me.userId}
                  online={me.online}
                  editing={editing}
                  onEditingChange={setEditing}
                  dryRun={dryRun}
                />
              )}

              <ProfileAddressCard
                open={addressOpen}
                onOpenChange={setAddressOpen}
              />
            </>
          )}

          <ProfileOptionsList signedIn={me.signedIn} hideAddressRow />

          {me.signedIn ? (
            <LogoutRow dryRun={dryRun} online={me.online} />
          ) : null}

          <BrandFooter className="pt-2 pb-8" />
        </div>
      )}
    </main>
  );
}
