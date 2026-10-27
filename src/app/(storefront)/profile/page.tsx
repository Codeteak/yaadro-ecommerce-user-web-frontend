import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Headset,
  Heart,
  History,
  LogOut,
  MapPin,
  Settings,
  TicketPercent,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { BrandFooter } from "@/components/storefront/BrandFooter";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Yaadro account.",
};

const quickActions = [
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/coupons", label: "Voucher / Coupons", icon: TicketPercent },
  { href: "/orders", label: "Order History", icon: History },
] as const;

const menuItems = [
  { href: "/profile/edit", label: "My Profile", icon: UserRound },
  { href: "/profile/addresses", label: "Address Management", icon: MapPin },
  { href: "/profile/support", label: "Help & Support", icon: Headset },
  { href: "/profile/settings", label: "Setting", icon: Settings },
] as const;

export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
      {/* Mint hero — no overflow-hidden on this ancestor so PageHeader sticky works */}
      <section className="relative rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2.5rem]"
          aria-hidden
        >
          <div className="absolute -top-20 -right-16 size-52 rounded-full bg-leaf/10" />
          <div className="absolute top-24 -left-20 size-44 rounded-full bg-leaf-bright/10" />
        </div>

        <div className="relative px-5 pb-16">
          <PageHeader surface="hero" backHref="/home" title="Profile" />

          <div className="relative mt-5 flex flex-col items-center text-center">
            {/* No profile photo yet — D logo fallback, same rule as SEO image */}
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
          </div>
        </div>
      </section>

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

          <Link
            href="/login"
            className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            <LogOut aria-hidden className="size-5 text-red-500" strokeWidth={1.9} />
            <span className="flex-1 text-[15px] font-medium text-red-600">
              Log out
            </span>
          </Link>
        </nav>

        <BrandFooter />
      </PullToRefresh>
    </main>
  );
}
