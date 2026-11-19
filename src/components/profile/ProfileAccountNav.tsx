"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronRight, Headset, MapPin, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/profile/LogoutButton";
import {
  hasCustomerSession,
  subscribeCustomerSession,
} from "@/lib/api/session";

const signedInItems = [
  { href: "/profile/edit", label: "My Profile", icon: UserRound },
  { href: "/profile/addresses", label: "Address", icon: MapPin },
  { href: "/profile/support", label: "Help & Support", icon: Headset },
] as const;

const guestItems = [
  { href: "/profile/support", label: "Help & Support", icon: Headset },
] as const;

type ProfileAccountNavProps = {
  /** Playground override. Omit on storefront to follow the real session. */
  previewSignedIn?: boolean;
};

/**
 * Account links under the profile hero.
 * Guests only see Help & Support (no Log out / My Profile / Address).
 * Log out → `/login` (phone step).
 */
export function ProfileAccountNav({ previewSignedIn }: ProfileAccountNavProps = {}) {
  const sessionSignedIn = useSyncExternalStore(
    subscribeCustomerSession,
    hasCustomerSession,
    () => false,
  );
  const signedIn = previewSignedIn ?? sessionSignedIn;
  const items = signedIn ? signedInItems : guestItems;

  return (
    <nav aria-label="Profile menu" className="mx-5 mt-6 flex flex-col gap-3">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <Icon aria-hidden className="size-5 text-forest" strokeWidth={1.9} />
          <span className="flex-1 text-[15px] font-medium text-ink">{label}</span>
          <ChevronRight aria-hidden className="size-5 text-muted" />
        </Link>
      ))}
      {signedIn ? <LogoutButton /> : null}
    </nav>
  );
}
