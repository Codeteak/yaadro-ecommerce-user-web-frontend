"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { ProductCard } from "@/components/product/ProductCard";
import {
  ConnectionStatusChip,
  type ConnectionChipKind,
} from "@/components/storefront/ConnectionStatusChip";
import {
  CategoryRailSkeleton,
  ProductRailSkeleton,
} from "@/components/ui/skeletons";
import { cn } from "@/lib/cn";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

type Bandwidth = "fast" | "3g" | "2g" | "save-data";

type Phase = "shell" | "hero" | "rail" | "essentials" | "secondary" | "ready";

const STEP_MS: Record<Bandwidth, number> = {
  fast: 220,
  "3g": 700,
  "2g": 1400,
  "save-data": 500,
};

const POLICY: Record<
  Bandwidth,
  {
    label: string;
    chip: ConnectionChipKind | null;
    peek: number;
    prefetch: boolean;
    deferSecondary: boolean;
    blurb: string;
  }
> = {
  fast: {
    label: "Fast",
    chip: null,
    peek: 4,
    prefetch: true,
    deferSecondary: false,
    blurb: "Full home · prefetch on · 4 peek cards",
  },
  "3g": {
    label: "3G",
    chip: "slow",
    peek: 4,
    prefetch: true,
    deferSecondary: true,
    blurb: "Chip D · secondary shelves delayed · prefetch on",
  },
  "2g": {
    label: "2G",
    chip: "slow",
    peek: 2,
    prefetch: false,
    deferSecondary: true,
    blurb: "2 peek cards · no prefetch · secondary deferred",
  },
  "save-data": {
    label: "Save-Data",
    chip: "saver",
    peek: 2,
    prefetch: false,
    deferSecondary: true,
    blurb: "Essentials first · tap Load more for shelves · no prefetch",
  },
};

/**
 * Playground-only Phase 3: connection-aware / low-bandwidth home loading.
 * Not wired to ecom yet — confirm here first.
 */
export function LowBandwidthLoadingDemo() {
  const [bandwidth, setBandwidth] = useState<Bandwidth>("3g");
  const [phase, setPhase] = useState<Phase>("shell");
  const [runId, setRunId] = useState(0);
  const [loadMore, setLoadMore] = useState(false);
  const timers = useRef<number[]>([]);
  const policy = POLICY[bandwidth];

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const schedule = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const replay = useCallback(() => {
    clearTimers();
    setLoadMore(false);
    setRunId((n) => n + 1);
  }, [clearTimers]);

  useEffect(() => {
    clearTimers();
    const step = STEP_MS[bandwidth];
    const p = POLICY[bandwidth];

    // schedule(0) avoids sync setState-in-effect (replay already resets loadMore)
    schedule(0, () => setPhase("shell"));
    schedule(step, () => setPhase("hero"));
    schedule(step * 2, () => setPhase("rail"));
    schedule(step * 3, () => setPhase("essentials"));

    if (!p.deferSecondary) {
      schedule(step * 4, () => setPhase("secondary"));
      schedule(step * 5, () => setPhase("ready"));
    } else if (bandwidth === "save-data") {
      // Wait for Load more CTA
      schedule(step * 3, () => setPhase("essentials"));
    } else {
      schedule(step * 5, () => setPhase("secondary"));
      schedule(step * 6, () => setPhase("ready"));
    }

    return () => clearTimers();
  }, [bandwidth, runId, clearTimers, schedule]);

  useEffect(() => {
    if (!loadMore) return;
    const step = STEP_MS[bandwidth];
    schedule(step, () => setPhase("secondary"));
    schedule(step * 2, () => setPhase("ready"));
  }, [loadMore, bandwidth, schedule]);

  const peek = useMemo(
    () => SAMPLE_PRODUCTS.slice(0, policy.peek),
    [policy.peek],
  );

  const showHero = phase !== "shell";
  const showRail = phase === "rail" || phase === "essentials" || phase === "secondary" || phase === "ready";
  const showEssentials =
    phase === "essentials" || phase === "secondary" || phase === "ready";
  const showSecondary = phase === "secondary" || phase === "ready";
  const showLoadMoreCta =
    bandwidth === "save-data" &&
    showEssentials &&
    !showSecondary &&
    !loadMore;

  return (
    <DemoFrame
      surface="bare"
      note="Lab mirrors live /home: chip D + save-data Load more. Prefetch already skips 2g/save-data."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="grid grid-cols-4 gap-1 rounded-full bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Bandwidth simulation"
        >
          {(Object.keys(POLICY) as Bandwidth[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={bandwidth === id}
              onClick={() => {
                setBandwidth(id);
                replay();
              }}
              className={cn(
                "rounded-full px-1 py-2 text-[11px] font-bold transition",
                bandwidth === id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:text-forest",
              )}
            >
              {POLICY[id].label}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-mint/40 px-3 py-2 ring-1 ring-forest/10">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-semibold text-forest">
              {policy.blurb}
            </p>
            <button
              type="button"
              onClick={replay}
              className="shrink-0 rounded-full bg-track px-3 py-1 text-[11px] font-bold text-black"
            >
              Replay
            </button>
          </div>
          <p className="mt-1 text-[11px] font-medium text-forest/70">
            Prefetch:{" "}
            <span className="font-bold">
              {policy.prefetch ? "on" : "off"}
            </span>
            {" · "}
            Peek: <span className="font-bold">{policy.peek}</span>
            {" · "}
            Secondary:{" "}
            <span className="font-bold">
              {policy.deferSecondary ? "deferred" : "immediate"}
            </span>
          </p>
        </div>

        <div className="relative h-[min(72vh,36rem)] overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div className="h-full overflow-y-auto overscroll-contain pb-8">
            {policy.chip && showHero ? (
              <ConnectionStatusChip kind={policy.chip} className="mt-3" />
            ) : null}

            {!showHero ? (
              <div className="border-b border-forest/10 bg-mint/30 px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-white/80" />
                  <div className="h-4 w-28 rounded bg-white/70" />
                </div>
                <div className="mt-3 h-12 rounded-full bg-white/75" />
              </div>
            ) : (
              <MiniHero />
            )}

            {showRail ? (
              <MiniRail />
            ) : showHero ? (
              <CategoryRailSkeleton />
            ) : null}

            {showEssentials ? (
              <section className="px-5 pt-3">
                <div className="flex items-end justify-between">
                  <h3 className="text-[15px] font-extrabold text-forest">
                    Popular picks
                  </h3>
                  <span className="text-[11px] font-semibold text-muted">
                    {peek.length} shown
                  </span>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-3">
                  {peek.map((product) => (
                    <li key={product.id} className="min-w-0">
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : showRail ? (
              <div className="pt-4">
                <ProductRailSkeleton className="px-5" count={policy.peek} />
              </div>
            ) : null}

            {showLoadMoreCta ? (
              <div className="px-5 pt-4">
                <button
                  type="button"
                  onClick={() => setLoadMore(true)}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-track text-[13px] font-bold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)]"
                >
                  Load more sections
                </button>
              </div>
            ) : null}

            {showSecondary ? (
              <section className="mt-5 space-y-4 px-5">
                <h3 className="text-[15px] font-extrabold text-forest">
                  More for you
                </h3>
                <ul className="grid grid-cols-2 gap-3">
                  {SAMPLE_PRODUCTS.slice(4, 8).map((product) => (
                    <li key={product.id} className="min-w-0">
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {phase === "ready" ? (
              <p className="mt-6 px-5 text-center text-[11px] font-semibold text-leaf">
                Ready · {policy.label} policy applied
              </p>
            ) : null}
          </div>
        </div>

        <p className="text-center text-[11px] leading-4 text-muted">
          Live /home reads{" "}
          <code className="rounded bg-mint/50 px-1">navigator.connection</code>{" "}
          via <code className="rounded bg-mint/50 px-1">useConnectionChipKind</code>.
        </p>
      </div>
    </DemoFrame>
  );
}

function MiniHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-forest/70 uppercase">
        Delivering to
      </p>
      <h2 className="mt-1 text-lg font-extrabold text-forest">Yaadro Market</h2>
      <div className="mt-3 flex h-12 items-center rounded-full bg-white/90 px-4 text-[13px] font-semibold text-muted ring-1 ring-white">
        Search milk, eggs…
      </div>
    </section>
  );
}

function MiniRail() {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-3" aria-label="Categories">
      {["All", "Dairy", "Snacks", "Drinks"].map((name) => (
        <span
          key={name}
          className="shrink-0 rounded-full bg-mint px-3.5 py-2 text-[12px] font-bold text-forest ring-1 ring-forest/10"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
