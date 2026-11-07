"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { useShopName } from "@/components/shop/ShopNameProvider";
import { pickDefaultProfileAvatar } from "@/lib/default-profile-avatar";

type ProfileHeroProps = {
  backHref?: string;
  /**
   * Signed-in scaffold until a real session API exists.
   * Storefront `/profile` passes true (same idea as WishlistProvider).
   */
  signedIn?: boolean;
  /** Seed for the default avatar (user id). */
  userId?: string;
  /**
   * Real user name when auth exists. When omitted, falls back to
   * `{shopName} Member` (supermarket brand — not Yaadro platform).
   */
  displayName?: string;
  signedInSubtitle?: string;
};

/**
 * Profile mint hero: guest Sign in, or signed-in default avatar + name.
 * Avatars are circular art already — no extra round background behind them.
 */
export function ProfileHero({
  backHref = "/home",
  signedIn = false,
  userId = "demo-user",
  displayName,
  signedInSubtitle = "Orders, coupons and wishlist stay on this device until login is connected.",
}: ProfileHeroProps) {
  const shopName = useShopName();
  const resolvedName = displayName?.trim() || `${shopName} Member`;
  const avatarSrc = pickDefaultProfileAvatar(userId);

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
          {signedIn ? (
            <>
              <Image
                src={avatarSrc}
                alt=""
                width={112}
                height={112}
                unoptimized
                className="size-28 object-cover"
              />
              <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
                {resolvedName}
              </h2>
              <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
                {signedInSubtitle}
              </p>
            </>
          ) : (
            <>
              <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(47,107,47,0.12)] ring-1 ring-leaf/15">
                <Image
                  src="/onboarding/brand-mark-white-y.svg"
                  alt=""
                  width={58}
                  height={69}
                  unoptimized
                  className="h-16 w-auto object-contain"
                />
              </div>
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
