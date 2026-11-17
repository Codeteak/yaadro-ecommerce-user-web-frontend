import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ChevronRight,
  Headset,
  Heart,
  History,
  MapPin,
  TicketPercent,
  UserRound,
} from "lucide-react";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your account.",
};

const quickActions = [
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/coupons", label: "Voucher / Coupons", icon: TicketPercent },
  { href: "/orders", label: "Order History", icon: History },
] as const;

/** Local signed-in seed removed — ProfileHero reads the OTP session. */

const menuItems = [
  { href: "/profile/edit", label: "My Profile", icon: UserRound },
  { href: "/profile/addresses", label: "Address", icon: MapPin },
  { href: "/profile/support", label: "Help & Support", icon: Headset },
] as const;

async function ProfilePageBody() {
  const shop = await getShopSeo();

  return (
    <ShopNameProvider name={shop.name}>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
        <ProfileHero />

        <PullToRefresh>
          {/* Quick actions — Wishlist replaces Notification from the reference.
              Card shell + bent placement only; labels/icons/icon colours unchanged. */}
          <section
            aria-label="Quick actions"
            className="relative z-10 mx-4 -mt-12 grid grid-cols-3 gap-2 px-1 pt-3 pb-2 [perspective:600px]"
          >
            {quickActions.map(({ href, label, icon: Icon }, index) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-2 rounded-[1.75rem] bg-gradient-to-b from-white via-white to-mint/50 px-2 py-5 text-center shadow-[0_16px_32px_rgba(47,107,47,0.16)] ring-1 ring-leaf/30 transition duration-300 hover:-translate-y-1 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                  index === 0
                    ? "-rotate-[5deg] translate-y-3 border-b-4 border-b-leaf/50"
                    : index === 2
                      ? "rotate-[5deg] translate-y-3 border-b-4 border-b-leaf/50"
                      : "z-10 -translate-y-1 border-b-4 border-b-forest/60 shadow-[0_20px_36px_rgba(47,107,47,0.20)]"
                }`}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-mint/70 text-forest">
                  <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                </span>
                <span className="text-[11px] leading-4 font-semibold text-ink">
                  {label}
                </span>
              </Link>
            ))}
          </section>

          {/* Menu */}
          <nav aria-label="Profile menu" className="mx-5 mt-6 flex flex-col gap-3">
            {menuItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-leaf/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <Icon aria-hidden className="size-5 text-forest" strokeWidth={1.9} />
                <span className="flex-1 text-[15px] font-medium text-ink">
                  {label}
                </span>
                <ChevronRight aria-hidden className="size-5 text-muted" />
              </Link>
            ))}

            <LogoutButton />
          </nav>

          <BrandFooter />
        </PullToRefresh>
      </main>
    </ShopNameProvider>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageBody />
    </Suspense>
  );
}
