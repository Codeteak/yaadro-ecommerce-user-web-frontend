"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Copy, X } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import {
  CouponTicketCard,
  ticketStatusChip,
} from "@/components/coupons/CouponTicketCard";
import { cn } from "@/lib/cn";
import { listCoupons } from "@/lib/api/coupons";
import {
  couponsBySection,
  type SampleCoupon,
} from "@/lib/sample-coupons";

function subscribeNever() {
  return () => undefined;
}

type CouponsPageContentProps = {
  backHref?: string;
  coupons?: SampleCoupon[];
};

/**
 * Coupons list (ticket cards + status themes) + details sheet with copy code.
 * Data from `listCoupons()` until a real coupons API exists.
 */
export function CouponsPageContent({
  backHref = "/profile",
  coupons = listCoupons(),
}: CouponsPageContentProps) {
  const [selected, setSelected] = useState<SampleCoupon | null>(null);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const sections = couponsBySection(coupons);
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const canCopy = selected?.status === "active";

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setCopied(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const openCoupon = (coupon: SampleCoupon) => {
    setCopied(false);
    setSelected(coupon);
  };

  const closeSheet = () => {
    setSelected(null);
    setCopied(false);
  };

  const copyCode = async () => {
    if (!selected || selected.status !== "active") return;
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const sheet =
    mounted && selected
      ? createPortal(
          <div
            className="fixed inset-0 z-[70]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <button
              type="button"
              aria-label="Close coupon details"
              onClick={closeSheet}
              className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
            />
            {/* Bottom-anchored sheet — height follows content, capped so it stays low */}
            <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(32rem,58dvh)] w-full max-w-lg flex-col rounded-t-[2rem] bg-paper shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
              <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-forest/15" aria-hidden />
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-leaf uppercase">
                      Coupon details
                    </p>
                    <h2 id={titleId} className="mt-1 text-lg font-bold text-ink">
                      {selected.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">{selected.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-forest ring-1 ring-leaf/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <X className="h-4.5 w-4.5" aria-hidden />
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-white px-4 py-4 ring-1 ring-leaf/15">
                  <p className="text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">
                    Code
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-mono text-2xl font-extrabold tracking-wider",
                      canCopy ? "text-black" : "text-muted",
                    )}
                  >
                    {selected.code}
                  </p>
                  <button
                    type="button"
                    onClick={copyCode}
                    disabled={!canCopy}
                    aria-disabled={!canCopy}
                    className={cn(
                      "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                      canCopy
                        ? "cursor-pointer bg-track text-black hover:bg-leaf-bright"
                        : "cursor-not-allowed bg-black/[0.06] text-muted",
                    )}
                  >
                    {canCopy ? (
                      copied ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" aria-hidden />
                          Copy code
                        </>
                      )
                    ) : (
                      <>
                        <Copy className="h-4 w-4 opacity-50" aria-hidden />
                        {selected.status === "used"
                          ? "Already used"
                          : "Expired"}
                      </>
                    )}
                  </button>
                  {copied && canCopy && (
                    <p
                      className="mt-2 text-center text-[13px] font-medium text-forest"
                      role="status"
                    >
                      Code copied to clipboard
                    </p>
                  )}
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Discount</dt>
                    <dd className="font-semibold text-ink">
                      {selected.discountLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Minimum</dt>
                    <dd className="text-right font-semibold text-ink">
                      {selected.minOrderLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Validity</dt>
                    <dd className="text-right font-semibold text-ink">
                      {selected.validUntilLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Status</dt>
                    <dd>
                      {(() => {
                        const chip = ticketStatusChip(selected.status);
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase",
                              chip.className,
                            )}
                          >
                            {chip.label}
                          </span>
                        );
                      })()}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-forest/10 pt-4">
                  <h3 className="text-[13px] font-bold text-ink">Terms</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-5 text-muted">
                    {selected.terms.map((term) => (
                      <li key={term}>{term}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref={backHref} title="Coupons" />

      <PullToRefresh className="flex flex-1 flex-col pb-8">
        {coupons.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Image
              src="/coupons/empty-coupons.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-52 max-w-full"
              priority
            />
            <h2 className="mt-5 text-xl font-extrabold text-ink">No coupons yet</h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              Offers from your shop will show up here when they are available.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {sections.map(({ section, items }) => (
              <section key={section} aria-label={section}>
                <h2 className="mb-3 text-[13px] font-semibold text-muted">
                  {section}
                </h2>
                <ul className="flex flex-col gap-3">
                  {items.map((coupon) => (
                    <li key={coupon.id}>
                      <CouponTicketCard
                        coupon={coupon}
                        onClick={() => openCoupon(coupon)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PullToRefresh>

      {sheet}
    </main>
  );
}
