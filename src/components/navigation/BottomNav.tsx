"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, User } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: ClipboardList },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-1 rounded-full bg-[#f3f4f6]/95 px-2 py-2 shadow-[0_8px_28px_rgba(6,78,59,0.12)] ring-1 ring-black/5 backdrop-blur-md">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                  active
                    ? "bg-track px-4 text-white shadow-sm"
                    : "w-11 text-ink/70 hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[22px] shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {active ? (
                  <span className="text-[13px] font-semibold tracking-tight">
                    {label}
                  </span>
                ) : (
                  <span className="sr-only">{label}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
