"use client";

import { useLayoutEffect, type ReactNode } from "react";
import {
  getCatalogScrollY,
  getPlaygroundLastSlug,
} from "@/lib/playground/session";

/**
 * After returning to the catalog index, restore window scroll and bring the
 * last-viewed component card into view.
 */
export function PlaygroundCatalogRestore({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const slug = getPlaygroundLastSlug();
    if (slug) {
      const el = document.querySelector<HTMLElement>(
        `[data-playground-slug="${CSS.escape(slug)}"]`,
      );
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        return;
      }
    }

    const y = getCatalogScrollY();
    if (y != null && y > 0) {
      window.scrollTo(0, y);
    }
  }, []);

  return <>{children}</>;
}
