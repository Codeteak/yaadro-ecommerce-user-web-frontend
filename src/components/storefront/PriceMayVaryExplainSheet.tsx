"use client";

import Link from "next/link";
import { CloseButton } from "@/components/navigation/CloseButton";
import { PRICE_MAY_VARY_EXPLAIN } from "@/lib/price-may-vary";

type PriceMayVaryExplainSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Help FAQ deep-link (e.g. `/profile/support?topic=price`).
   * When set, shows a CTA; caller should push return path before navigate.
   */
  helpHref?: string;
  onHelpClick?: () => void;
  /** Primary action after reading (e.g. continue to checkout). */
  continueLabel?: string;
  onContinue?: () => void;
};

/**
 * Phase D #33 — why prices may change (shop update + weight).
 */
export function PriceMayVaryExplainSheet({
  open,
  onOpenChange,
  helpHref,
  onHelpClick,
  continueLabel,
  onContinue,
}: PriceMayVaryExplainSheetProps) {
  if (!open) return null;

  const helpButtonClass =
    "flex h-12 w-full items-center justify-center rounded-full text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-vary-explain-title"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-track/45 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative mx-0 mb-0 w-full max-w-lg rounded-t-[1.75rem] bg-paper p-5 shadow-[0_24px_48px_rgba(47,107,47,0.28)] sm:mx-4 sm:mb-4 sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="price-vary-explain-title"
            className="text-lg font-extrabold text-black"
          >
            {PRICE_MAY_VARY_EXPLAIN.title}
          </h2>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>
        <p className="mt-2 text-[13px] leading-5 text-muted">
          {PRICE_MAY_VARY_EXPLAIN.intro}
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {PRICE_MAY_VARY_EXPLAIN.reasons.map((reason) => (
            <li
              key={reason.id}
              className="rounded-2xl bg-mint/35 px-3.5 py-3 ring-1 ring-forest/10"
            >
              <p className="text-[14px] font-extrabold text-black">
                {reason.title}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-muted">
                {reason.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col gap-2">
          {continueLabel && onContinue ? (
            <button
              type="button"
              onClick={() => {
                onContinue();
                onOpenChange(false);
              }}
              className={`${helpButtonClass} bg-track text-black hover:bg-leaf-bright`}
            >
              {continueLabel}
            </button>
          ) : null}

          {helpHref ? (
            <Link
              href={helpHref}
              onClick={() => {
                onHelpClick?.();
                onOpenChange(false);
              }}
              className={`${helpButtonClass} bg-white text-forest ring-1 ring-forest/15 hover:bg-mint`}
            >
              {PRICE_MAY_VARY_EXPLAIN.helpLabel}
            </Link>
          ) : onHelpClick ? (
            <button
              type="button"
              onClick={() => {
                onHelpClick();
                onOpenChange(false);
              }}
              className={`${helpButtonClass} ${
                continueLabel
                  ? "bg-white text-forest ring-1 ring-forest/15 hover:bg-mint"
                  : "bg-track text-black hover:bg-leaf-bright"
              }`}
            >
              {PRICE_MAY_VARY_EXPLAIN.helpLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
