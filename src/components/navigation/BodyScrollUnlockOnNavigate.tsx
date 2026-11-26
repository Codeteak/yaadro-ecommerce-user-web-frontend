"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { forceClearBodyScrollLock } from "@/lib/use-body-scroll-lock";

/**
 * Clears leaked body scroll locks when the route changes or the tab is
 * restored from bfcache. Storefront + playground shells mount this once.
 */
export function BodyScrollUnlockOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    forceClearBodyScrollLock();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) forceClearBodyScrollLock();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
