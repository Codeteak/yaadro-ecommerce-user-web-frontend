"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared scroll state for the floating chrome (bottom nav + cart bar)
 * so both are driven by the same signals and never disagree:
 * - `navHidden`: true while scrolling down past a small threshold,
 *   false on scroll up or near the top.
 * - `scrolling`: true while scroll events are actively firing,
 *   settling back to false ~1s after they stop.
 */
export function useScrollDirection() {
  const [navHidden, setNavHidden] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const lastYRef = useRef(0);
  const hiddenRef = useRef(false);
  const scrollingRef = useRef(false);
  const idleTimerRef = useRef(0);

  useEffect(() => {
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;

      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setScrolling(true);
      }
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        setScrolling(false);
      }, 1000);

      const dy = y - lastYRef.current;
      if (y <= 140 || dy < -4) {
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setNavHidden(false);
        }
      } else if (dy > 4) {
        if (!hiddenRef.current) {
          hiddenRef.current = true;
          setNavHidden(true);
        }
      }
      lastYRef.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  return { navHidden, scrolling };
}
