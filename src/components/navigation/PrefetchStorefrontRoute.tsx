"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Quietly warms the Next.js route cache after the current page is idle
 * so taps (e.g. home search → /categories) feel instant.
 */
export function PrefetchStorefrontRoute({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
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
