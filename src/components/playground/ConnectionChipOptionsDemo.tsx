"use client";

import { Database, Gauge, Wifi } from "lucide-react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { ConnectionStatusChip } from "@/components/storefront/ConnectionStatusChip";
import { cn } from "@/lib/cn";

const SLOW = "Slow connection — loading essentials";
const SAVER = "Data saver on — essentials only";

type ChipKind = "slow" | "saver";
type StyleId = "A" | "B" | "C" | "D" | "E";

const STYLES: {
  id: StyleId;
  name: string;
  blurb: string;
  live?: boolean;
}[] = [
  {
    id: "A",
    name: "Amber strip",
    blurb: "Bordered amber bar, centered text.",
  },
  {
    id: "B",
    name: "Amber island + icon",
    blurb: "Same family as offline banner F.",
  },
  {
    id: "C",
    name: "Mint soft",
    blurb: "Brand mint — quieter than amber.",
  },
  {
    id: "D",
    name: "Pill + tortoise / warehouse",
    blurb: "Chosen — refined pill with SVG Repo icons.",
    live: true,
  },
  {
    id: "E",
    name: "Top rule strip",
    blurb: "Cream strip with gold rules.",
  },
];

/**
 * Playground compare — Slow connection + Data saver chip designs.
 * Live choice: **D** (refined pill + tortoise / data-warehouse SVGs).
 */
export function ConnectionChipOptionsDemo() {
  return (
    <DemoFrame
      surface="bare"
      note="Live = D on /home. Tortoise = slow (3g/2g) · data-warehouse = saveData. Save-Data also defers shelves behind Load more."
    >
      <div className="mx-auto max-w-lg space-y-5">
        {STYLES.map((style) => (
          <section
            key={style.id}
            className={cn(
              "overflow-hidden rounded-2xl bg-paper ring-1",
              style.live ? "ring-2 ring-leaf" : "ring-forest/10",
            )}
          >
            <header className="flex items-baseline justify-between gap-2 border-b border-forest/10 px-4 py-2.5">
              <p className="text-[13px] font-extrabold text-forest">
                <span
                  className={cn(
                    "mr-1.5 inline-flex size-6 items-center justify-center rounded-lg text-[12px] font-black",
                    style.live ? "bg-leaf text-white" : "bg-track text-black",
                  )}
                >
                  {style.id}
                </span>
                {style.name}
                {style.live ? (
                  <span className="ml-2 text-[10px] font-bold tracking-wide text-leaf uppercase">
                    Live
                  </span>
                ) : null}
              </p>
              <p className="max-w-[13rem] text-right text-[11px] font-medium text-muted">
                {style.blurb}
              </p>
            </header>
            <div className="space-y-3 bg-[#f3f6f3] px-0 py-4">
              {style.id === "D" ? (
                <>
                  <ConnectionStatusChip kind="slow" />
                  <ConnectionStatusChip kind="saver" />
                </>
              ) : (
                <>
                  <ChipPreview id={style.id} kind="slow" />
                  <ChipPreview id={style.id} kind="saver" />
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </DemoFrame>
  );
}

function ChipPreview({ id, kind }: { id: StyleId; kind: ChipKind }) {
  const text = kind === "slow" ? SLOW : SAVER;
  const Icon = kind === "slow" ? Gauge : Database;

  switch (id) {
    case "A":
      return (
        <p
          role="status"
          className="mx-3 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-950"
        >
          {text}
        </p>
      );
    case "B":
      return (
        <div className="mx-3 flex items-center gap-2.5 rounded-2xl border border-amber-400 bg-amber-50 px-3 py-2.5 shadow-[0_6px_18px_rgba(180,83,9,0.08)]">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-amber-500 text-black"
          >
            <Icon className="size-4" strokeWidth={2.4} />
          </span>
          <p className="min-w-0 flex-1 text-left text-[12px] font-bold text-amber-950">
            {text}
          </p>
        </div>
      );
    case "C":
      return (
        <div className="mx-3 flex items-center gap-2.5 rounded-2xl bg-mint/90 px-3 py-2.5 ring-1 ring-forest/15">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-track text-black"
          >
            <Icon className="size-4" strokeWidth={2.4} />
          </span>
          <p className="min-w-0 flex-1 text-left text-[12px] font-bold text-forest">
            {text}
          </p>
        </div>
      );
    case "E":
      return (
        <p
          role="status"
          className="border-y border-amber-400 bg-[#fffbf0] px-4 py-2.5 text-center text-[12px] font-bold text-amber-950"
        >
          {text}
        </p>
      );
    default:
      return (
        <div className="flex justify-center px-3">
          <p
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold",
              kind === "slow"
                ? "bg-amber-50 text-amber-950 ring-1 ring-amber-400"
                : "bg-mint text-forest ring-1 ring-forest/20",
            )}
          >
            <Wifi className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            {text}
          </p>
        </div>
      );
  }
}
