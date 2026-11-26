"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  forceClearBodyScrollLock,
  reconcileBodyScrollLock,
} from "@/lib/use-body-scroll-lock";

/**
 * Clears leaked body scroll locks when the route changes, the tab returns
 * from background/bfcache, the window regains focus, or the shopper touches
 * the page while no dialog is open. Storefront + playground shells mount
 * this once so scroll never needs a refresh.
 */
export function BodyScrollUnlockOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    forceClearBodyScrollLock();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = () => {
      reconcileBodyScrollLock();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reconcileBodyScrollLock();
      }
    };
    const onFocus = () => {
      reconcileBodyScrollLock();
    };
    // Heal leaked locks on first interaction (sheets can leave overflow:hidden).
    const onPointerDown = () => {
      reconcileBodyScrollLock();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    document.addEventListener("pointerdown", onPointerDown, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return null;
}
