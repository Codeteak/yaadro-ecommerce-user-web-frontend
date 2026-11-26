"use client";

import { useEffect, useRef, useState } from "react";
import { navScrollAction } from "@/components/navigation/nav-scroll-policy";

/**
 * Shared scroll state for the floating chrome (bottom nav + cart bar)
 * so both are driven by the same signals and never disagree:
 * - `navHidden`: true while scrolling down past a small threshold,
 *   false on scroll up (away from the bottom) or near the top.
 * - `scrolling`: true while scroll events are actively firing,
 *   settling back to false ~1s after they stop.
 *
 * Listens in the capture phase so nested overflow panels (e.g.
 * `/categories` product column) count — window scroll alone is not enough
 * when the page is `h-dvh` with inner `overflow-y-auto`.
 *
 * Near-bottom upward deltas are ignored so end-of-scroll clamps /
 * rubber-band cannot re-show the nav.
 */
/**
 * @param enabled — when false, skip attaching a listener (used when a parent
 *   `NavScrollProvider` already owns the shared scroll state).
 */
export function useScrollDirection(enabled = true) {
  const [navHidden, setNavHidden] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const lastYByTargetRef = useRef(new WeakMap<object, number>());
  const hiddenRef = useRef(false);
  const scrollingRef = useRef(false);
  const idleTimerRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const readY = (
      target: EventTarget | null,
    ): { key: object; y: number; nearTop: number; maxY: number } | null => {
      if (
        target === document ||
        target === document.documentElement ||
        target === document.body ||
        target === document.scrollingElement
      ) {
        const el = document.scrollingElement ?? document.documentElement;
        const maxY = Math.max(0, el.scrollHeight - window.innerHeight);
        return { key: window, y: window.scrollY, nearTop: 140, maxY };
      }
      if (target instanceof HTMLElement) {
        // Ignore non-scrolling nodes that can still fire in some browsers.
        const style = window.getComputedStyle(target);
        const canScrollY =
          /(auto|scroll|overlay)/.test(style.overflowY) ||
          target.scrollHeight > target.clientHeight + 1;
        if (!canScrollY) return null;
        const maxY = Math.max(0, target.scrollHeight - target.clientHeight);
        return { key: target, y: target.scrollTop, nearTop: 48, maxY };
      }
      return null;
    };

    const onScroll = (event: Event) => {
      const read = readY(event.target);
      if (!read) return;
      const { key, y, nearTop, maxY } = read;
      const last = lastYByTargetRef.current.get(key) ?? y;
      const dy = y - last;
      lastYByTargetRef.current.set(key, y);

      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setScrolling(true);
      }
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        setScrolling(false);
      }, 1000);

      const action = navScrollAction({ y, dy, nearTop, maxY });
      if (action === "show") {
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setNavHidden(false);
        }
      } else if (action === "hide") {
        if (!hiddenRef.current) {
          hiddenRef.current = true;
          setNavHidden(true);
        }
      }
    };

    // Capture: scroll does not bubble; nested CategoryBrowser panels need this.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(idleTimerRef.current);
    };
  }, [enabled]);

  return { navHidden, scrolling };
}
