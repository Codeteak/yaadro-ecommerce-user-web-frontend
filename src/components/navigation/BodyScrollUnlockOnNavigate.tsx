"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  forceClearBodyScrollLock,
  reconcileBodyScrollLock,
} from "@/lib/use-body-scroll-lock";

/**
 * Clears leaked body scroll locks when the route changes, the tab returns
 * from background/bfcache, or the window regains focus. Storefront +
 * playground shells mount this once so shoppers never need a refresh to scroll.
 */
export function BodyScrollUnlockOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    forceClearBodyScrollLock();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = () => {
      // Always reconcile — bfcache and normal restores both leave /home stuck.
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

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
