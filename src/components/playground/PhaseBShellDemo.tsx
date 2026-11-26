"use client";

import type { CSSProperties } from "react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { BottomNav } from "@/components/navigation/BottomNav";
import {
  NavScrollProvider,
  useNavScroll,
} from "@/components/navigation/NavScrollContext";
import { BrandFooter } from "@/components/storefront/BrandFooter";

/**
 * Phase B #29 playground — fixed header + scroll body + fixed bottom nav.
 * Clearance collapses with scroll-hide (same as live StorefrontChrome).
 */
function PhaseBShellInner() {
  const { navHidden } = useNavScroll();
  const style = {
    ["--storefront-nav-clearance" as string]: navHidden ? "0px" : "5.5rem",
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className="relative flex h-[75vh] flex-col overflow-hidden bg-paper ring-1 ring-black/5"
    >
      <div className="shrink-0 border-b border-forest/8 bg-paper">
        <PageHeader backHref="/playground" title="Storefront shell" />
      </div>
      <div
        data-storefront-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-[var(--storefront-nav-clearance,5.5rem)] transition-[padding-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <p className="text-[13px] font-semibold text-forest">Phase B #29</p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Common fixed header (PageHeader) + fixed footer nav (BottomNav). Scroll
          down — nav hides and bottom padding collapses (no blank strip). Scroll
          up to restore.
        </p>
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} className="mt-3 text-sm text-ink">
            Scroll block {i + 1} — page content lives here.
          </p>
        ))}
        <BrandFooter className="pt-8" />
      </div>
      <BottomNav position="inline" />
    </div>
  );
}

export function PhaseBShellDemo() {
  return (
    <NavScrollProvider>
      <PhaseBShellInner />
    </NavScrollProvider>
  );
}
