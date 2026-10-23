"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollDirection } from "@/components/navigation/useScrollDirection";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: ClipboardList },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
] as const;

type BottomNavProps = {
  /**
   * `fixed` — storefront chrome (viewport bottom).
   * `inline` — playground / nested preview (absolute inside a relative frame).
   */
  position?: "fixed" | "inline";
};

export function BottomNav({ position = "fixed" }: BottomNavProps) {
  const pathname = usePathname();
  const { navHidden } = useScrollDirection();
  const inline = position === "inline";
  const hide = !inline && navHidden;

  return (
    <nav
      aria-label="Primary"
      aria-hidden={hide || undefined}
      className={cn(
        "flex justify-center px-4 transition-all duration-300 ease-out",
        inline
          ? "absolute inset-x-0 bottom-0 z-10 pb-3 pointer-events-none"
          : "fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none",
        hide
          ? "translate-y-[130%] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <ul
        className={cn(
          "flex w-full max-w-md items-center justify-between gap-1 rounded-full bg-[#f3f4f6]/95 px-2 py-2 shadow-[0_8px_28px_rgba(47,107,47,0.12)] ring-1 ring-black/5 backdrop-blur-md",
          hide ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
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
                    ? "bg-track px-4 text-black shadow-sm"
                    : "w-11 text-black hover:text-black/70",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[22px] shrink-0 text-black"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {active ? (
                  <span className="text-[13px] font-semibold tracking-tight text-black">
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
