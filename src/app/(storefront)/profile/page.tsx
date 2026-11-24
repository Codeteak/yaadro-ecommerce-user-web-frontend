import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { History } from "lucide-react";
import { ProfileAccountNav } from "@/components/profile/ProfileAccountNav";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfilePullContent } from "@/components/profile/ProfilePullContent";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { ProfilePageSkeleton } from "@/components/ui/skeletons";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your account.",
};

type QuickAction = {
  href: string;
  label: string;
  icon: ReactNode;
};

const quickActions: QuickAction[] = [
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: (
      <Image
        src="/icons/wishlist.svg"
        alt=""
        width={22}
        height={22}
        className="size-[22px] object-contain"
        unoptimized
      />
    ),
  },
  {
    href: "/coupons",
    label: "Voucher / Coupons",
    icon: (
      <Image
        src="/icons/coupon.svg"
        alt=""
        width={22}
        height={22}
        className="size-[22px] object-contain"
        unoptimized
      />
    ),
  },
  {
    href: "/orders",
    label: "Order History",
    icon: <History aria-hidden className="size-5 text-black" strokeWidth={1.9} />,
  },
];

async function ProfilePageBody() {
  const shop = await getShopSeo();

  return (
    <ShopNameProvider name={shop.name}>
      {/*
        Fill height under bottom nav + one overflow pane so short phones
        (iPhone SE) can always scroll to Help + brand footer. See
        MULTI_PHONE_LAYOUT_PLAN.md Phase B.
      */}
      <main
        data-storefront-fill
        className="relative mx-auto flex h-[calc(100dvh-var(--storefront-nav-clearance,5.5rem)-env(safe-area-inset-bottom,0px))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <ProfilePullContent className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain scroll-pb-8 [-webkit-overflow-scrolling:touch]">
          <ProfileHero />

          {/* Quick actions — Wishlist replaces Notification from the reference.
              Card shell + bent placement only; labels/icons/icon colours unchanged. */}
          <section
            aria-label="Quick actions"
            className="relative z-10 mx-4 -mt-12 grid grid-cols-3 gap-2 px-1 pt-3 pb-2 max-[700px]:-mt-9 max-[700px]:gap-1.5 max-[700px]:pt-1 [perspective:600px]"
          >
            {quickActions.map(({ href, label, icon }, index) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-2 rounded-[1.75rem] bg-gradient-to-b from-white via-white to-mint/50 px-2 py-5 text-center shadow-[0_16px_32px_rgba(47,107,47,0.16)] ring-1 ring-leaf/30 transition duration-300 hover:-translate-y-1 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf max-[700px]:gap-1.5 max-[700px]:rounded-[1.35rem] max-[700px]:py-3 ${
                  index === 0
                    ? "-rotate-[5deg] translate-y-3 border-b-4 border-b-leaf/50 max-[700px]:translate-y-2"
                    : index === 2
                      ? "rotate-[5deg] translate-y-3 border-b-4 border-b-leaf/50 max-[700px]:translate-y-2"
                      : "z-10 -translate-y-1 border-b-4 border-b-forest/60 shadow-[0_20px_36px_rgba(47,107,47,0.20)]"
                }`}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-mint/70 text-black max-[700px]:size-10">
                  {icon}
                </span>
                <span className="text-[11px] leading-4 font-semibold text-ink">
                  {label}
                </span>
              </Link>
            ))}
          </section>

          <ProfileAccountNav />

          {/* Extra end padding so Help / brand mark aren’t sliced flush by the scroll clip. */}
          <BrandFooter className="pt-8 pb-12 max-[700px]:pt-5 max-[700px]:pb-14" />
        </ProfilePullContent>

        {/* Soften the hard overflow edge on short phones (scroll still clips; fade hides the cut). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-paper via-paper/80 to-transparent"
        />
      </main>
    </ShopNameProvider>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageBody />
    </Suspense>
  );
}
