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
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Subscribe to lock open/closed (for install prompt, etc.). */
export function subscribeScrollLock(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function isScrollLocked(): boolean {
  return openLocks > 0;
}

/** Server snapshot — assume unlocked so SSR matches first paint. */
export function getScrollLockServerSnapshot(): boolean {
  return false;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const wasLocked = openLocks > 0;
    openLocks += 1;
    if (openLocks === 1) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    if (!wasLocked) notify();

    return () => {
      const before = openLocks > 0;
      openLocks = Math.max(0, openLocks - 1);
      if (openLocks === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
      if (before && openLocks === 0) notify();
    };
  }, [locked]);
}
