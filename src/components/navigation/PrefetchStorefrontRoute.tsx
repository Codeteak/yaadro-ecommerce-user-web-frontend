"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { shouldSkipPrefetchOnSlowNetwork } from "@/lib/network-connection";

/**
 * Quietly warms the Next.js route cache after the current page is idle
 * so taps (e.g. home search → /categories) feel instant.
 * Skips on offline / save-data / 2g so low-bandwidth users aren't competed with.
 */
export function PrefetchStorefrontRoute({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    if (shouldSkipPrefetchOnSlowNetwork()) return;

    let idleId = 0;
    let timeoutId = 0;

    const run = () => {
      try {
        router.prefetch(href);
      } catch {
        // Prefetch is best-effort; ignore unsupported environments.
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 2_000 });
    } else {
      timeoutId = window.setTimeout(run, 400);
    }

    return () => {
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [href, router]);

  return null;
}
