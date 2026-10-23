"use client";

import { useLayoutEffect } from "react";

/**
 * Disables the browser's scroll-restoration and jumps to the top on mount.
 * Use on pages that should always open at the top after a hard refresh
 * (e.g. the home hero), instead of restoring a mid-page scroll position.
 *
 * Avoid raw <script> tags under client boundaries (React 19 / Next 16 warn
 * and never execute them). Setting scrollRestoration as soon as this module
 * evaluates, then scrolling in useLayoutEffect, is the supported path.
 */
if (typeof window !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

export function ScrollToTopOnLoad() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    const onPageShow = (e: PageTransitionEvent) => {
      // Back-forward cache can re-show the page at the old scroll offset.
      if (e.persisted) window.scrollTo(0, 0);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
