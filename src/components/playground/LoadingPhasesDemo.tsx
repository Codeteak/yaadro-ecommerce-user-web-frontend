"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { ProductCard } from "@/components/product/ProductCard";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import {
  CategoryRailSkeleton,
  HomeCatalogSkeleton,
  HomeHeroSkeleton,
  ProductRailSkeleton,
  StorefrontPageSkeleton,
} from "@/components/ui/skeletons";
import { cn } from "@/lib/cn";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

type Strategy = "full" | "phased";
type Network = "fast" | "slow" | "offline";

type Phase =
  | "idle"
  | "shell"
  | "hero"
  | "rail"
  | "catalog"
  | "ready"
  | "offline-cache";

const NETWORK_MS: Record<Exclude<Network, "offline">, number> = {
  fast: 280,
  slow: 1100,
};

const PEEK = SAMPLE_PRODUCTS.slice(0, 4);

/**
 * Teach-demo: full-page skeleton (legacy) vs phased sections (live ecom).
 * Live: `(storefront)/loading.tsx` → StorefrontRouteShell; home/dairy/festive
 * stream sections; prefetch skips 2g/save-data/offline.
 */
export function LoadingPhasesDemo() {
  const [strategy, setStrategy] = useState<Strategy>("phased");
  const [network, setNetwork] = useState<Network>("fast");
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState(0);
  const timers = useRef<number[]>([]);

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
    setRunId((n) => n + 1);
  }, [clearTimers]);

  useEffect(() => {
    clearTimers();

    if (network === "offline") {
      return () => clearTimers();
    }

    const step = NETWORK_MS[network];

    if (strategy === "full") {
      schedule(0, () => setPhase("shell"));
      schedule(step * 3, () => setPhase("ready"));
      return () => clearTimers();
    }

    // Phased: shell → hero → rail → catalog → ready
    schedule(0, () => setPhase("shell"));
    schedule(step, () => setPhase("hero"));
    schedule(step * 2, () => setPhase("rail"));
    schedule(step * 3, () => setPhase("catalog"));
    schedule(step * 4, () => setPhase("ready"));
    return () => clearTimers();
  }, [strategy, network, runId, clearTimers, schedule]);

  const effectivePhase: Phase =
    network === "offline" ? "offline-cache" : phase;

  const phaseLabel =
    network === "offline"
      ? "Offline — showing last cached paint"
      : strategy === "full"
        ? effectivePhase === "ready"
          ? "Full skeleton done → page"
          : "Waiting on full-page skeleton…"
        : effectivePhase === "shell"
          ? "1 · Shell (chrome only)"
          : effectivePhase === "hero"
            ? "2 · Hero streamed"
            : effectivePhase === "rail"
              ? "3 · Category rail"
              : effectivePhase === "catalog"
                ? "4 · Catalog rails"
                : "Ready — all sections live";

  return (
    <DemoFrame
      surface="bare"
      note="Wired ecom: route shell + section Suspense + Offline F banner. Toasts use Lucide (offline-safe). Prefetch skips 2g/save-data/offline."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="flex rounded-full bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Loading strategy"
        >
          {(
            [
              ["phased", "Phased (proposed)"],
              ["full", "Full skeleton (today)"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={strategy === id}
              onClick={() => {
                setStrategy(id);
                replay();
              }}
              className={cn(
                "flex-1 rounded-full px-2.5 py-2 text-[12px] font-bold transition",
                strategy === id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:text-forest",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="flex rounded-full bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Network simulation"
        >
          {(
            [
              ["fast", "Fast"],
              ["slow", "Slow"],
              ["offline", "Offline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={network === id}
              onClick={() => {
                setNetwork(id);
                replay();
              }}
              className={cn(
                "flex-1 rounded-full px-2.5 py-2 text-[12px] font-bold transition",
                network === id
                  ? "bg-mint text-forest shadow-sm"
                  : "text-forest/70 hover:text-forest",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-mint/35 px-3 py-2 ring-1 ring-forest/10">
          <p className="text-[12px] font-semibold text-forest">{phaseLabel}</p>
          <button
            type="button"
            onClick={replay}
            className="shrink-0 rounded-full bg-track px-3 py-1.5 text-[11px] font-bold text-black"
          >
            Replay
          </button>
        </div>

        {strategy === "phased" && network !== "offline" ? (
          <ol className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold text-forest/55">
            {(
              [
                ["shell", "Shell"],
                ["hero", "Hero"],
                ["rail", "Rail"],
                ["catalog", "Catalog"],
              ] as const
            ).map(([id, label]) => {
              const order = ["shell", "hero", "rail", "catalog", "ready"] as const;
              const step =
                effectivePhase === "idle" || effectivePhase === "offline-cache"
                  ? "shell"
                  : effectivePhase;
              const current = order.indexOf(step);
              const mine = order.indexOf(id);
              const done = current > mine || effectivePhase === "ready";
              const active = effectivePhase === id;
              return (
                <li
                  key={id}
                  className={cn(
                    "rounded-lg px-1 py-1.5 ring-1",
                    done || active
                      ? "bg-track/40 text-forest ring-forest/20"
                      : "bg-paper ring-forest/10",
                  )}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="relative h-[min(72vh,36rem)] overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div className="h-full overflow-y-auto overscroll-contain">
            {network === "offline" ? (
              <OfflineCachedPaint />
            ) : strategy === "full" ? (
              effectivePhase === "ready" ? (
                <ReadyHomePaint />
              ) : (
                <StorefrontPageSkeleton className="min-h-0 pt-4 pb-8" />
              )
            ) : (
              <PhasedPaint phase={effectivePhase} />
            )}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

function OfflineCachedPaint() {
  return (
    <div>
      <OfflineStatusBanner forcePreview className="pt-3" />
      <ReadyHomePaint dimmed />
    </div>
  );
}

function PhasedPaint({ phase }: { phase: Phase }) {
  if (phase === "shell") {
    return (
      <div className="pb-8">
        {/* Instant chrome — not a blank full-page skeleton */}
        <div className="border-b border-forest/10 bg-mint/30 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/80" />
            <div className="h-4 w-28 rounded bg-white/70" />
          </div>
          <div className="mt-3 h-12 rounded-full bg-white/75" />
        </div>
        <HomeHeroSkeleton />
      </div>
    );
  }

  if (phase === "hero") {
    return (
      <div className="pb-8">
        <MiniHeroResolved />
        <CategoryRailSkeleton />
        <div className="pt-4">
          <ProductRailSkeleton className="px-5" count={3} />
        </div>
      </div>
    );
  }

  if (phase === "rail") {
    return (
      <div className="pb-8">
        <MiniHeroResolved />
        <MiniRailResolved />
        <div className="pt-4">
          <ProductRailSkeleton className="px-5" count={3} />
        </div>
      </div>
    );
  }

  if (phase === "catalog") {
    return (
      <div className="pb-8">
        <MiniHeroResolved />
        <MiniRailResolved />
        <HomeCatalogSkeleton className="!pt-4" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <MiniHeroResolved />
      <MiniRailResolved />
      <ReadyCatalog />
    </div>
  );
}

function MiniHeroResolved() {
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

function MiniRailResolved() {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-3" aria-label="Categories">
      {["All", "Dairy", "Snacks", "Drinks", "Fruit"].map((name) => (
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

function ReadyCatalog() {
  return (
    <section className="px-5 pt-2 pb-4">
      <div className="flex items-end justify-between gap-2">
        <h3 className="text-[15px] font-extrabold text-forest">Popular picks</h3>
        <span className="text-[11px] font-semibold text-muted">See all</span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {PEEK.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadyHomePaint({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div className={cn(dimmed && "opacity-90")}>
      <MiniHeroResolved />
      <MiniRailResolved />
      <ReadyCatalog />
    </div>
  );
}
