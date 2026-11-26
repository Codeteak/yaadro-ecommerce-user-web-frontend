"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  forceClearBodyScrollLock,
  reconcileBodyScrollLock,
} from "@/lib/use-body-scroll-lock";

/**
 * Clears leaked body scroll locks when the route changes (including
 * categories → home), after view transitions settle, on bfcache/tab focus,
 * and on pointerdown when no dialog is open.
 */
export function BodyScrollUnlockOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    forceClearBodyScrollLock();
    // Categories fill + sheets can leave overflow:hidden; VT exit may re-apply
    // briefly after the first clear — sweep again on the next frames.
    const raf = window.requestAnimationFrame(() => {
      forceClearBodyScrollLock();
    });
    const t = window.setTimeout(() => {
      forceClearBodyScrollLock();
      reconcileBodyScrollLock();
    }, 400);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [pathname]);

  useEffect(() => {
    const heal = () => {
      reconcileBodyScrollLock();
    };
    const onPageShow = () => {
      forceClearBodyScrollLock();
      reconcileBodyScrollLock();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") heal();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", heal);
    document.addEventListener("pointerdown", heal, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", heal);
      document.removeEventListener("pointerdown", heal, true);
    };
  }, []);

  return null;
}
