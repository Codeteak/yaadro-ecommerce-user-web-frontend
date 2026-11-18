"use client";

import Image from "next/image";
import Link from "next/link";
import { History } from "lucide-react";
import { cn } from "@/lib/cn";

const ACTIONS = [
  { href: "/wishlist", label: "Wishlist", iconSrc: "/icons/wishlist.svg" as const },
  {
    href: "/coupons",
    label: "Voucher / Coupons",
    iconSrc: "/icons/coupon.svg" as const,
  },
  {
    href: "/orders",
    label: "Order History",
    iconSrc: null,
  },
] as const;

type ProfileQuickActionsProps = {
  className?: string;
  /**
   * Playground can remap links (e.g. `/playground/…`) without changing labels.
   */
  hrefFor?: (href: (typeof ACTIONS)[number]["href"]) => string;
};

/**
 * Profile quick-action cards — Wishlist / Coupons / Order History.
 * Straight row, equal icon boxes so SVGs align.
 */
export function ProfileQuickActions({
  className,
  hrefFor,
}: ProfileQuickActionsProps) {
  return (
    <section
      aria-label="Quick actions"
      className={cn(
        "relative z-10 mx-4 grid grid-cols-3 gap-2.5 px-1",
        className,
      )}
    >
      {ACTIONS.map(({ href, label, iconSrc }) => (
        <Link
          key={href}
          href={hrefFor ? hrefFor(href) : href}
          className="flex flex-col items-center gap-2.5 rounded-[1.5rem] bg-gradient-to-b from-white via-white to-mint/50 px-2 py-4 text-center shadow-[0_12px_28px_rgba(47,107,47,0.14)] ring-1 ring-leaf/25 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <span className="grid size-11 place-items-center rounded-full bg-mint/80 text-black">
            {iconSrc ? (
              <Image
                src={iconSrc}
                alt=""
                width={24}
                height={24}
                className="size-6 object-contain"
                unoptimized
              />
            ) : (
              <History aria-hidden className="size-5" strokeWidth={1.9} />
            )}
          </span>
          <span className="min-h-[2rem] text-[11px] leading-4 font-semibold text-ink">
            {label}
          </span>
        </Link>
      ))}
    </section>
  );
}
