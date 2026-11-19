"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { useCustomerAuthStatus } from "@/components/auth/useCustomerSignedIn";
import { getMyProfile } from "@/lib/api/profile";
import {
  GUEST_PROFILE_AVATAR,
  GUEST_PROFILE_AVATAR_LEGACY,
  pickDefaultProfileAvatar,
} from "@/lib/default-profile-avatar";
import { ProfileHeroSkeleton } from "@/components/ui/skeletons";
import {
  readCachedProfileUi,
  writeCachedProfileUi,
  type CachedProfileUi,
} from "@/lib/profile-cache";

type ProfileHeroProps = {
  backHref?: string;
  /**
   * Override the live OTP session. Playground demos pass this.
   * Omit it on `/profile` so the hero follows the real session.
   */
  signedIn?: boolean;
  /** Seed for the default avatar (user id). */
  userId?: string;
  /**
   * Real user name when known. Playground demos pass this.
   * On `/profile`, omitted so the hero loads displayName / name from
   * GET /api/me/profile when signed in.
   */
  displayName?: string;
  signedInSubtitle?: string;
  /** Guest avatar. Defaults to `/icons/guest-profile.png`. */
  guestAvatarSrc?: string;
};

function profileDisplayName(profile: {
  customer: { displayName: string | null };
  user: { name: string | null };
}): string | null {
  const nickname = profile.customer.displayName?.trim();
  if (nickname) return nickname;
  const name = profile.user.name?.trim();
  if (name) return name;
  return null;
}

function HeroShell({
  backHref,
  children,
}: {
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2.5rem]"
        aria-hidden
      >
        <div className="absolute -top-20 -right-16 size-52 rounded-full bg-leaf/10" />
        <div className="absolute top-24 -left-20 size-44 rounded-full bg-leaf-bright/10" />
      </div>

      <div className="relative px-5 pb-16">
        <PageHeader surface="hero" backHref={backHref} title="Profile" />
        <div className="relative mt-5 flex flex-col items-center text-center">
          {children}
        </div>
      </div>
    </section>
  );
}

function SignedInPlaceholder({
  cached,
  subtitle,
}: {
  cached: CachedProfileUi | null;
  subtitle: string;
}) {
  if (cached) {
    return (
      <>
        <Image
          src={pickDefaultProfileAvatar(cached.userId)}
          alt=""
          width={112}
          height={112}
          unoptimized
          className="size-28 object-cover"
        />
        <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
          {cached.displayName}
        </h2>
        <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
          {subtitle}
        </p>
      </>
    );
  }
  return <ProfileHeroSkeleton />;
}

/**
 * Profile mint hero: guest Sign in, or signed-in default avatar + name.
 * Avatars are circular art already — no extra round background behind them.
 */
export function ProfileHero({
  backHref = "/home",
  signedIn: signedInProp,
  userId,
  displayName,
  signedInSubtitle = "Orders, coupons and wishlist stay on this device.",
  guestAvatarSrc = GUEST_PROFILE_AVATAR,
}: ProfileHeroProps) {
  const authStatus = useCustomerAuthStatus();
  const signedIn =
    signedInProp ?? (authStatus === "signed-in" ? true : authStatus === "guest" ? false : null);
  const propName = displayName?.trim() || null;
  const [cached, setCached] = useState<CachedProfileUi | null>(null);

  useEffect(() => {
    setCached(readCachedProfileUi());
  }, []);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => getMyProfile(signal),
    enabled: signedIn === true && !propName,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profile.data) return;
    const name = profileDisplayName(profile.data);
    const id = profile.data.user.id?.trim();
    if (!name || !id) return;
    writeCachedProfileUi({ userId: id, displayName: name });
    setCached({ userId: id, displayName: name });
  }, [profile.data]);

  const apiName = profile.data ? profileDisplayName(profile.data) : null;
  const resolvedName =
    propName || apiName || cached?.displayName || null;
  const avatarSeed =
    profile.data?.user.id?.trim() ||
    userId?.trim() ||
    cached?.userId ||
    null;
  const guestSrc = guestAvatarSrc;
  const guestIsLegacyMark = guestSrc === GUEST_PROFILE_AVATAR_LEGACY;

  // Session restore / playground override still resolving.
  if (signedInProp === undefined && authStatus === "loading") {
    return (
      <HeroShell backHref={backHref}>
        <SignedInPlaceholder cached={cached} subtitle={signedInSubtitle} />
      </HeroShell>
    );
  }

  const isSignedIn = signedIn === true;
  const showHeroBones =
    isSignedIn &&
    profile.isPending &&
    !propName &&
    !resolvedName;

  return (
    <section className="relative rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2.5rem]"
        aria-hidden
      >
        <div className="absolute -top-20 -right-16 size-52 rounded-full bg-leaf/10" />
        <div className="absolute top-24 -left-20 size-44 rounded-full bg-leaf-bright/10" />
      </div>

      <div className="relative px-5 pb-16">
        <PageHeader surface="hero" backHref={backHref} title="Profile" />

        <div className="relative mt-5 flex flex-col items-center text-center">
          {isSignedIn ? (
            showHeroBones ? (
              <ProfileHeroSkeleton />
            ) : profile.isError && !resolvedName ? (
              <>
                <div className="size-28 rounded-full bg-mint/50" />
                <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
                  Couldn’t load profile
                </h2>
                <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
                  Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void profile.refetch()}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <Image
                  src={pickDefaultProfileAvatar(avatarSeed || "customer")}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className="size-28 object-cover"
                />
                <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
                  {resolvedName ?? "Customer"}
                </h2>
                <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
                  {signedInSubtitle}
                </p>
              </>
            )
          ) : (
            <>
              {guestIsLegacyMark ? (
                <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(47,107,47,0.12)] ring-1 ring-leaf/15">
                  <Image
                    src={guestSrc}
                    alt=""
                    width={58}
                    height={69}
                    unoptimized
                    className="h-16 w-auto object-contain"
                  />
                </div>
              ) : (
                <Image
                  src={guestSrc}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className="size-28 rounded-full object-cover shadow-[0_10px_30px_rgba(47,107,47,0.12)] ring-1 ring-leaf/15"
                />
              )}
              <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
                Guest User
              </h2>
              <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
                Sign in to sync your orders, coupons and wishlist.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
