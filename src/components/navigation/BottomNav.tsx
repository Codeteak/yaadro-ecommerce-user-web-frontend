"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Heart, Home, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useNavScroll } from "@/components/navigation/NavScrollContext";

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
  const { navHidden } = useNavScroll();
  const inline = position === "inline";
  // Hide on scroll-down for storefront and playground (nested panels included).
  const hide = navHidden;
  const navRef = useRef<HTMLElement>(null);

  // Prefer `inert` over `aria-hidden` so a focused tab cannot stay focused
  // while the pill is scrolled away (browser console warning).
  useEffect(() => {
    if (!hide) return;
    const root = navRef.current;
    const active = document.activeElement;
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur();
    }
  }, [hide]);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      inert={hide || undefined}
      style={
        inline ? undefined : { viewTransitionName: "storefront-bottom-nav" }
      }
      className={cn(
        "flex justify-center px-3 sm:px-4 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        inline
          ? "absolute inset-x-0 bottom-0 z-50 pb-3 pointer-events-none"
          : "fixed inset-x-0 bottom-0 z-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none",
        hide
          ? "translate-y-[130%] opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <ul
        className={cn(
          // Inactive tabs stay icon-sized; active grows to fit its full label
          // (equal flex-1 slots were clipping “Categories” on every width).
          "flex w-full min-w-0 max-w-[min(100%,28rem)] items-center justify-between gap-1 rounded-full bg-[#f3f4f6]/95 px-1.5 py-2 shadow-[0_8px_28px_rgba(47,107,47,0.12)] ring-1 ring-black/5 backdrop-blur-md sm:gap-1.5 sm:px-2",
          hide ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li
              key={href}
              className={cn(
                "flex justify-center",
                active ? "min-w-0 shrink" : "shrink-0",
              )}
            >
              <Link
                href={href}
                transitionTypes={["nav-tab"]}
                aria-current={active ? "page" : undefined}
                tabIndex={hide ? -1 : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center justify-center rounded-full transition-[padding,background-color,box-shadow,color,transform,gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf motion-safe:active:scale-[0.96]",
                  active
                    ? "gap-1.5 bg-track px-3 text-black shadow-sm sm:gap-2 sm:px-4"
                    : "size-11 px-0 text-black hover:text-black/70",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[22px] shrink-0 text-black transition-[stroke-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {active ? (
                  <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap text-black">
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
