"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Headset, MapPin, UserRound } from "lucide-react";
import { useCustomerAuthStatus } from "@/components/auth/useCustomerSignedIn";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";
import { CloseButton } from "@/components/navigation/CloseButton";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileNavSkeleton } from "@/components/ui/skeletons";

const guestItems = [
  { href: "/profile/support", label: "Help & Support", icon: Headset },
] as const;

type ProfileAccountNavProps = {
  /** Playground override. Omit on storefront to follow the real session. */
  previewSignedIn?: boolean;
  /** Log out confirm sheet. On for live `/profile`; playground may pass dryRun. */
  confirmBeforeLogout?: boolean;
  /** Playground: confirm toasts only (no session clear). */
  logoutDryRun?: boolean;
};

/** Opens the address sheet from `/profile?address=1` (Help FAQ / old route). */
function AddressDeepLink({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (searchParams.get("address") !== "1") return;
    onOpenRef.current();
    if (pathname) {
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  return null;
}

/**
 * Account links under the profile hero.
 * Guests only see Help & Support (no Log out / My Profile / Address).
 * Address opens a manage sheet (#31) — no dedicated `/profile/addresses` page.
 * Log out asks first, then → `/login` (unless dryRun).
 */
export function ProfileAccountNav({
  previewSignedIn,
  confirmBeforeLogout = true,
  logoutDryRun = false,
}: ProfileAccountNavProps = {}) {
  const authStatus = useCustomerAuthStatus();
  const signedIn =
    previewSignedIn ??
    (authStatus === "signed-in"
      ? true
      : authStatus === "guest"
        ? false
        : null);
  const [addressOpen, setAddressOpen] = useState(false);

  return (
    <>
      <Suspense fallback={null}>
        <AddressDeepLink onOpen={() => setAddressOpen(true)} />
      </Suspense>
      <nav aria-label="Profile menu" className="mx-5 mt-6 flex flex-col gap-3">
        {signedIn === null ? (
          <ProfileNavSkeleton className="mx-0 mt-0 w-full" />
        ) : signedIn ? (
          <>
            <Link
              href="/profile/edit"
              className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <UserRound
                aria-hidden
                className="size-5 text-forest"
                strokeWidth={1.9}
              />
              <span className="flex-1 text-[15px] font-medium text-ink">
                My Profile
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </Link>

            <button
              type="button"
              onClick={() => setAddressOpen(true)}
              className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <MapPin
                aria-hidden
                className="size-5 text-forest"
                strokeWidth={1.9}
              />
              <span className="flex-1 text-[15px] font-medium text-ink">
                Address
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </button>

            <Link
              href="/profile/support"
              className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <Headset
                aria-hidden
                className="size-5 text-forest"
                strokeWidth={1.9}
              />
              <span className="flex-1 text-[15px] font-medium text-ink">
                Help & Support
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </Link>
          </>
        ) : (
          guestItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <Icon
                aria-hidden
                className="size-5 text-forest"
                strokeWidth={1.9}
              />
              <span className="flex-1 text-[15px] font-medium text-ink">
                {label}
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </Link>
          ))
        )}
        {signedIn ? (
          <LogoutButton
            confirmBeforeLogout={confirmBeforeLogout}
            dryRun={logoutDryRun}
          />
        ) : null}
      </nav>

      {addressOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-address-title"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-track/45 backdrop-blur-[2px]"
            onClick={() => setAddressOpen(false)}
          />
          <div className="relative mx-0 mb-0 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-paper shadow-[0_24px_48px_rgba(47,107,47,0.28)] sm:mx-4 sm:mb-4 sm:rounded-[1.75rem]">
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-2">
              <h2
                id="profile-address-title"
                className="text-lg font-extrabold text-black"
              >
                Address
              </h2>
              <CloseButton onClick={() => setAddressOpen(false)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <p className="text-[13px] leading-5 text-muted">
                Your delivery address for home and checkout.
              </p>
              <SavedAddressesManageList className="mt-5" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
