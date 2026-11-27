"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { cn } from "@/lib/cn";

const TITLE = "No connection";
const DETAIL = "Showing the last page we loaded.";

type OptionId = "F" | "A" | "B" | "C" | "D" | "E";

const OPTIONS: {
  id: OptionId;
  name: string;
  blurb: string;
  featured?: boolean;
}[] = [
  {
    id: "F",
    name: "Inline + Try again",
    blurb: "Wired live — amber card · Try again right · black icon.",
    featured: true,
  },
  {
    id: "A",
    name: "Stacked island",
    blurb: "Previous mint stacked (retired).",
  },
  {
    id: "B",
    name: "Inline row",
    blurb: "Icon + text in one row (mint).",
  },
  {
    id: "C",
    name: "Slim strip",
    blurb: "Full-width soft bar, single line.",
  },
  {
    id: "D",
    name: "Paper outline",
    blurb: "White card, forest ring — quieter.",
  },
  {
    id: "E",
    name: "Stacked + Try again",
    blurb: "Centered stack with track CTA below.",
  },
];

/**
 * Playground compare — pick an offline banner before changing live ecom.
 * Live still uses option A. Featured F = B + E Try again + amber warning card.
 */
export function OfflineBannerOptionsDemo() {
  return (
    <DemoFrame
      surface="bare"
      note="Live ecom = F (amber inline + Try again). A–E are compare-only specimens."
    >
      <div className="mx-auto max-w-lg space-y-5">
        {OPTIONS.map((opt) => (
          <section
            key={opt.id}
            className={cn(
              "overflow-hidden rounded-2xl bg-paper ring-1",
              opt.featured ? "ring-2 ring-track" : "ring-forest/10",
            )}
          >
            <header className="flex items-baseline justify-between gap-2 border-b border-forest/10 px-4 py-2.5">
              <p className="text-[13px] font-extrabold text-forest">
                <span
                  className={cn(
                    "mr-1.5 inline-flex size-6 items-center justify-center rounded-lg text-[12px] font-black",
                    opt.featured
                      ? "bg-track text-black"
                      : "bg-mint text-forest",
                  )}
                >
                  {opt.id}
                </span>
                {opt.name}
                {opt.featured ? (
                  <span className="ml-2 text-[10px] font-bold tracking-wide text-leaf uppercase">
                    New
                  </span>
                ) : null}
              </p>
              <p className="max-w-[14rem] text-right text-[11px] font-medium text-muted">
                {opt.blurb}
              </p>
            </header>
            <div className="bg-[#f3f6f3] px-0 py-4">
              <OptionPreview id={opt.id} />
            </div>
          </section>
        ))}
      </div>
    </DemoFrame>
  );
}

function OptionPreview({ id }: { id: OptionId }) {
  switch (id) {
    case "F":
      return <OptionF />;
    case "A":
      return <OptionA />;
    case "B":
      return <OptionB />;
    case "C":
      return <OptionC />;
    case "D":
      return <OptionD />;
    case "E":
      return <OptionE />;
  }
}

function IconBadge({
  className,
  warning = false,
}: {
  className?: string;
  warning?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        warning
          ? "bg-amber-500 text-black shadow-[0_4px_12px_rgba(180,83,9,0.28)]"
          : "bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.28)]",
        className,
      )}
    >
      <WifiOff className="size-4" strokeWidth={2.4} />
    </span>
  );
}

/**
 * F — B inline + E Try again on the right + amber offline/warning card
 * (same family as cart minimum / price-may-vary alerts).
 */
function OptionF() {
  return (
    <div className="mx-auto w-full max-w-lg px-5">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-amber-400 bg-amber-50 px-3.5 py-3",
          "shadow-[0_6px_18px_rgba(180,83,9,0.1)]",
        )}
      >
        <IconBadge warning className="size-8 rounded-[0.7rem]" />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-extrabold tracking-tight text-amber-950">
            {TITLE}
          </p>
          <p className="text-[12px] leading-4 font-medium text-amber-900/75">
            {DETAIL}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-track px-3.5 text-[12px] font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.25)]"
        >
          <RefreshCw className="size-3.5" strokeWidth={2.5} aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}

/** A — live stacked */
function OptionA() {
  return (
    <div className="mx-auto w-full max-w-lg px-5">
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl bg-mint/90 px-4 py-3.5 text-center",
          "shadow-[0_8px_24px_rgba(47,107,47,0.12)] ring-1 ring-forest/15",
        )}
      >
        <IconBadge />
        <div>
          <p className="text-[13px] font-extrabold tracking-tight text-forest">
            {TITLE}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 font-medium text-forest/75">
            {DETAIL}
          </p>
        </div>
      </div>
    </div>
  );
}

/** B — inline row */
function OptionB() {
  return (
    <div className="mx-auto w-full max-w-lg px-5">
      <div
        className={cn(
          "flex items-center justify-center gap-3 rounded-2xl bg-mint/90 px-4 py-3",
          "shadow-[0_8px_24px_rgba(47,107,47,0.12)] ring-1 ring-forest/15",
        )}
      >
        <IconBadge className="size-8 rounded-[0.7rem]" />
        <div className="min-w-0 text-left">
          <p className="text-[13px] font-extrabold tracking-tight text-forest">
            {TITLE}
          </p>
          <p className="text-[12px] leading-4 font-medium text-forest/75">
            {DETAIL}
          </p>
        </div>
      </div>
    </div>
  );
}

/** C — slim full strip */
function OptionC() {
  return (
    <div className="w-full bg-mint/80 px-4 py-2.5 ring-1 ring-inset ring-forest/10">
      <p className="flex items-center justify-center gap-2 text-center text-[12px] font-bold text-forest">
        <WifiOff className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        <span>
          {TITLE}
          <span className="font-medium text-forest/70"> · {DETAIL}</span>
        </span>
      </p>
    </div>
  );
}

/** D — paper outline */
function OptionD() {
  return (
    <div className="mx-auto w-full max-w-lg px-5">
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-center",
          "ring-1 ring-forest/20 shadow-[0_6px_20px_rgba(47,107,47,0.08)]",
        )}
      >
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-xl bg-mint text-forest ring-1 ring-forest/15"
        >
          <WifiOff className="size-4" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-[13px] font-extrabold tracking-tight text-forest">
            {TITLE}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 font-medium text-muted">
            {DETAIL}
          </p>
        </div>
      </div>
    </div>
  );
}

/** E — stacked + try again */
function OptionE() {
  return (
    <div className="mx-auto w-full max-w-lg px-5">
      <div
        className={cn(
          "flex flex-col items-center gap-2.5 rounded-2xl bg-mint/90 px-4 py-3.5 text-center",
          "shadow-[0_8px_24px_rgba(47,107,47,0.12)] ring-1 ring-forest/15",
        )}
      >
        <IconBadge />
        <div>
          <p className="text-[13px] font-extrabold tracking-tight text-forest">
            {TITLE}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 font-medium text-forest/75">
            {DETAIL}
          </p>
        </div>
        <button
          type="button"
          className="mt-0.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-track px-4 text-[12px] font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.25)]"
        >
          <RefreshCw className="size-3.5" strokeWidth={2.5} aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
