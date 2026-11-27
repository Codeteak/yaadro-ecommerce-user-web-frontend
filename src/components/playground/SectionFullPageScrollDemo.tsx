"use client";

import { useMemo, useState } from "react";
import { DailyDairyPageContent } from "@/components/home/DailyDairyPageContent";
import { FestiveOffersPageContent } from "@/components/home/FestiveOffersPageContent";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { SAMPLE_DAIRY_SHELF, type DairyShelf } from "@/lib/daily-dairy";
import { SAMPLE_FESTIVE_SHELF, type FestiveShelf } from "@/lib/festive-offers";
import { cn } from "@/lib/cn";

type Mode = "dairy" | "festive";

/** Repeat sample products so the phone frame must scroll. */
function longDairyShelf(copies = 5): DairyShelf {
  const products = Array.from({ length: copies }, (_, i) =>
    SAMPLE_DAIRY_SHELF.products.map((p) => ({
      ...p,
      id: `${p.id}-scroll-${i}`,
    })),
  ).flat();
  return { ...SAMPLE_DAIRY_SHELF, products };
}

function longFestiveShelf(copies = 3): FestiveShelf {
  const products = Array.from({ length: copies }, (_, i) =>
    SAMPLE_FESTIVE_SHELF.products.map((p) => ({
      ...p,
      id: `${p.id}-scroll-${i}`,
    })),
  ).flat();
  return { ...SAMPLE_FESTIVE_SHELF, products };
}

/**
 * Playground teach-demo: section See-all full page while scrolling.
 * Live: /dairy + /festive — pinned art, sticky header, scrolling grid, no BottomNav.
 */
export function SectionFullPageScrollDemo() {
  const [mode, setMode] = useState<Mode>("dairy");
  const dairyShelf = useMemo(() => longDairyShelf(), []);
  const festiveShelf = useMemo(() => longFestiveShelf(), []);

  return (
    <DemoFrame
      surface="bare"
      note="Scroll the phone frame. Art stays pinned, header sticks, product cards move, no BottomNav / no shell footer band. Live: /dairy · /festive."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="flex rounded-full bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Section full page variant"
        >
          {(
            [
              ["dairy", "Daily dairy"],
              ["festive", "Festive"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-[13px] font-bold transition",
                mode === id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:text-forest",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-2 text-[11px] leading-4 text-forest/80 sm:grid-cols-4">
          <li className="rounded-xl bg-mint/40 px-2.5 py-2 ring-1 ring-forest/10">
            <span className="font-bold text-forest">1 · Art</span>
            <br />
            sticky pin, stays put
          </li>
          <li className="rounded-xl bg-mint/40 px-2.5 py-2 ring-1 ring-forest/10">
            <span className="font-bold text-forest">2 · Header</span>
            <br />
            sticks at top
          </li>
          <li className="rounded-xl bg-mint/40 px-2.5 py-2 ring-1 ring-forest/10">
            <span className="font-bold text-forest">3 · Cards</span>
            <br />
            scroll over art
          </li>
          <li className="rounded-xl bg-mint/40 px-2.5 py-2 ring-1 ring-forest/10">
            <span className="font-bold text-forest">4 · Chrome</span>
            <br />
            no nav / pb-0
          </li>
        </ul>

        <div className="relative h-[min(78vh,40rem)] overflow-hidden rounded-[1.75rem] ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div
            data-storefront-scroll
            className="h-full overflow-y-auto overscroll-contain"
          >
            {mode === "dairy" ? (
              <DailyDairyPageContent
                shelf={dairyShelf}
                backHref="/playground/daily-dairy-section"
              />
            ) : (
              <FestiveOffersPageContent
                shelf={festiveShelf}
                backHref="/playground/festive-offers-section"
              />
            )}
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-4 pt-10 pb-3 text-center text-[11px] font-semibold text-white">
            Scroll inside · art + header stay · cards move
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
