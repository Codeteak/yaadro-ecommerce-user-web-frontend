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
      {/* Mint header like the reference, in Yaadro greens */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
        <div
          className="pointer-events-none absolute -top-20 -right-16 size-52 rounded-full bg-leaf/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-24 -left-20 size-44 rounded-full bg-leaf-bright/10"
          aria-hidden
        />

        <PageHeader backHref="/home" title="Profile" />

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

        {/* Gray brand footer — D + wordmark in muted gray (currentColor so both match) */}
        <footer
          className="flex items-center justify-center gap-2 pt-9 pb-6 text-muted/45"
          aria-label="Yaadro"
        >
          <svg
            viewBox="0 0 100 118.51"
            className="h-8 w-auto"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12.65 1.19L47.35 1.49L56.38 3.30L63.84 5.99L69.29 8.71L74.66 12.29L79.51 16.23L83.77 20.49L89.50 28.02L94.01 36.46L96.70 43.92L98.21 50.56L98.81 55.63L98.81 65.26L98.21 70.34L97.00 75.78L94.61 82.95L89.79 92.28L85.26 98.32L79.22 104.37L76.23 106.75L71.68 109.79L65.93 112.82L58.17 115.50L50.63 117.01L47.05 117.31L13.54 117.31L8.99 116.10L6.23 114.57L4.29 112.95L1.81 109.22L1.19 107.05L1.25 51.96L10.04 52.24L16.08 53.45L21.46 55.24L25.41 57.07L32.28 61.25L37.43 65.49L41.14 69.51L41.49 72.13L40.26 73.41L36.60 73.73L23.99 73.43L22.50 74.51L22.39 90.93L23.69 92.24L37.20 92.24L42.87 91.34L47.13 90.13L51.90 88.04L56.75 85.02L61.68 80.71L64.72 77.05L66.81 73.77L70.13 65.93L71.64 57.80L71.64 34.74L71.23 33.92L70.11 33.15L55.34 33.13L54.44 33.62L54.03 34.44L54.03 42.57L53.73 43.10L54.03 51.23L53.68 52.28L52.57 53.38L50.26 53.43L37.95 43.94L31.98 40.35L26.83 37.93L20.56 35.54L14.81 34.03L9.74 33.13L1.38 32.72L1.49 12.05L2.41 8.69L3.94 5.63L6.23 3.34L8.40 2.11L12.57 1.21Z" />
          </svg>
          <span className="text-[24px] leading-none font-extrabold tracking-tight lowercase">
            yaadro
          </span>
        </footer>
      </PullToRefresh>
    </main>
  );
}
