"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { BottomNav } from "@/components/navigation/BottomNav";
import { BrandFooter } from "@/components/storefront/BrandFooter";

/**
 * Phase B #29 playground — fixed header + scroll body + fixed bottom nav.
 * Live storefront still composes these per-page; this is the shell to confirm.
 */
export function PhaseBShellDemo() {
  return (
    <div className="relative flex h-[75vh] flex-col overflow-hidden bg-paper ring-1 ring-black/5">
      <div className="shrink-0 border-b border-forest/8 bg-paper">
        <PageHeader backHref="/playground" title="Storefront shell" />
      </div>
      <div
        data-storefront-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-[5.5rem]"
      >
        <p className="text-[13px] font-semibold text-forest">Phase B #29</p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Common fixed header (PageHeader) + fixed footer nav (BottomNav). Scroll
          the body — header stays, nav hides on scroll-down like storefront.
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
