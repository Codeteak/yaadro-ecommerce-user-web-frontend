"use client";

import { useEffect } from "react";

/**
 * Simple body scroll lock for sheets/modals.
 *
 * One open sheet → stop page scroll. Close it → allow scroll again.
 * A tiny counter covers rare overlaps (e.g. weight picker + another sheet)
 * so closing one does not unlock under the other, and we never restore a
 * previous `hidden` value (that was the stuck-scroll bug).
 */
let openLocks = 0;

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    openLocks += 1;
    if (openLocks === 1) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    return () => {
      openLocks = Math.max(0, openLocks - 1);
      if (openLocks === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
  }, [locked]);
}
