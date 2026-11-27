"use client";

import { useMemo, useState } from "react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { ConnectionStatusChip } from "@/components/storefront/ConnectionStatusChip";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { cn } from "@/lib/cn";
import { productPhoto } from "@/lib/product-image";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

type Scenario =
  | "fast"
  | "save-data"
  | "2g"
  | "offline-cached"
  | "offline-cold";

const SCENARIOS: {
  id: Scenario;
  label: string;
  blurb: string;
}[] = [
  {
    id: "fast",
    label: "Fast",
    blurb: "Full photos · prefetch on",
  },
  {
    id: "save-data",
    label: "Save-Data",
    blurb: "No product photos · chip D",
  },
  {
    id: "2g",
    label: "2G",
    blurb: "Placeholders · slow chip",
  },
  {
    id: "offline-cached",
    label: "Offline + cache",
    blurb: "Banner F · last paint",
  },
  {
    id: "offline-cold",
    label: "Offline cold",
    blurb: "No snapshot · Try again",
  },
];

const PEEK = SAMPLE_PRODUCTS.slice(0, 4);

/**
 * Phase 4 lab — mirrors live ProductCard lite media + home essentials snapshot.
 */
export function AdaptiveMediaOfflineDemo() {
  const [scenario, setScenario] = useState<Scenario>("save-data");

  const policy = useMemo(() => {
    switch (scenario) {
      case "fast":
        return {
          chip: null as null | "slow" | "saver",
          media: "full" as const,
          offline: false,
          hasCache: true,
          bytesNote: "~480 KB photos (4 cards)",
        };
      case "save-data":
        return {
          chip: "saver" as const,
          media: "placeholder" as const,
          offline: false,
          hasCache: true,
          bytesNote: "~0 KB photos · color tiles only",
        };
      case "2g":
        return {
          chip: "slow" as const,
          media: "placeholder" as const,
          offline: false,
          hasCache: true,
          bytesNote: "~0 KB photos · essentials text",
        };
      case "offline-cached":
        return {
          chip: null,
          media: "full" as const,
          offline: true,
          hasCache: true,
          bytesNote: "From last visit snapshot",
        };
      case "offline-cold":
        return {
          chip: null,
          media: "none" as const,
          offline: true,
          hasCache: false,
          bytesNote: "No cached catalog",
        };
    }
  }, [scenario]);

  return (
    <DemoFrame
      surface="bare"
      note="Phase 4 wired to ecom: ProductCard lite tiles on save-data/2g; /home saves essentials snapshot for offline cache vs cold empty."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl bg-paper p-1 ring-1 ring-forest/10 sm:grid-cols-3"
          role="tablist"
          aria-label="Phase 4 scenario"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scenario === s.id}
              onClick={() => setScenario(s.id)}
              className={cn(
                "rounded-xl px-2 py-2 text-left transition",
                scenario === s.id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:bg-mint/40 hover:text-forest",
              )}
            >
              <span className="block text-[11px] font-extrabold">{s.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[9px] leading-tight font-medium",
                  scenario === s.id ? "text-black/70" : "text-muted",
                )}
              >
                {s.blurb}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-mint/35 px-3 py-2 ring-1 ring-forest/10">
          <p className="text-[12px] font-semibold text-forest">
            Media:{" "}
            <span className="font-extrabold">
              {policy.media === "full"
                ? "full photos"
                : policy.media === "placeholder"
                  ? "placeholders"
                  : "none"}
            </span>
            {" · "}
            {policy.bytesNote}
          </p>
        </div>

        <div className="relative h-[min(72vh,36rem)] overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div className="h-full overflow-y-auto overscroll-contain pb-8">
            {policy.offline ? (
              <OfflineStatusBanner
                forcePreview
                tone={policy.hasCache ? "cached" : "reconnect"}
                className="pt-3"
              />
            ) : policy.chip ? (
              <ConnectionStatusChip kind={policy.chip} className="mt-3" />
            ) : null}

            <MiniHero dimmed={policy.offline && policy.hasCache} />

            {!policy.hasCache && policy.offline ? (
              <ColdOfflineEmpty />
            ) : (
              <section className="px-4 pt-3">
                <div className="flex items-end justify-between">
                  <h3 className="text-[15px] font-extrabold text-forest">
                    Essentials
                  </h3>
                  <span className="text-[10px] font-bold tracking-wide text-muted uppercase">
                    {policy.media === "placeholder" ? "Lite" : "Full"}
                  </span>
                </div>
                <ul
                  className={cn(
                    "mt-3 grid grid-cols-2 gap-3",
                    policy.offline && policy.hasCache && "opacity-80",
                  )}
                >
                  {PEEK.map((product, i) => (
                    <li key={product.id}>
                      <LiteProductCard
                        name={product.name}
                        unit={product.unit}
                        price={product.price}
                        image={productPhoto(product.image)}
                        media={policy.media === "none" ? "placeholder" : policy.media}
                        accentIndex={i}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {policy.offline && policy.hasCache ? (
              <p className="mt-5 px-4 text-center text-[11px] font-semibold text-amber-900/80">
                Prices may be outdated until you reconnect.
              </p>
            ) : null}
          </div>
        </div>

        <ol className="space-y-1.5 rounded-2xl bg-paper px-4 py-3 text-[11px] leading-4 text-muted ring-1 ring-forest/10">
          <li>
            <span className="font-bold text-forest">1.</span> Save-Data / 2G skip
            catalog photo bytes (color tile + initials).
          </li>
          <li>
            <span className="font-bold text-forest">2.</span> Offline + cache =
            banner F “last page” + dimmed snapshot.
          </li>
          <li>
            <span className="font-bold text-forest">3.</span> Offline cold = empty
            + Try again (no invent prices).
          </li>
          <li>
            <span className="font-bold text-forest">Live:</span>{" "}
            <code className="rounded bg-mint/50 px-1">ProductCard</code> +{" "}
            <code className="rounded bg-mint/50 px-1">HomePullContent</code>{" "}
            snapshot in localStorage.
          </li>
        </ol>
      </div>
    </DemoFrame>
  );
}

function MiniHero({ dimmed }: { dimmed?: boolean }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-6",
        dimmed && "opacity-85",
      )}
    >
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

function ColdOfflineEmpty() {
  return (
    <div className="mx-auto max-w-sm px-5 pt-8 text-center">
      <p className="text-[15px] font-extrabold text-forest">
        Nothing saved for offline
      </p>
      <p className="mt-2 text-[13px] leading-5 text-muted">
        Open home once while online so we can keep a lightweight snapshot for
        next time.
      </p>
      <button
        type="button"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-track px-5 text-sm font-bold text-black"
      >
        Try again
      </button>
    </div>
  );
}

const TILE = [
  "bg-[#e8f5e8] text-forest",
  "bg-[#fff3d6] text-amber-950",
  "bg-[#e8eef8] text-forest",
  "bg-[#fce8e8] text-red-900",
] as const;

function LiteProductCard({
  name,
  unit,
  price,
  image,
  media,
  accentIndex,
}: {
  name: string;
  unit: string;
  price: number;
  image: string;
  media: "full" | "placeholder";
  accentIndex: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-forest/10 shadow-[0_6px_16px_rgba(47,107,47,0.08)]">
      <div className="relative aspect-square">
        {media === "full" ? (
          <CatalogImage
            src={image}
            alt=""
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div
            aria-hidden
            className={cn(
              "flex h-full w-full items-center justify-center text-[22px] font-black tracking-tight",
              TILE[accentIndex % TILE.length],
            )}
          >
            {initials || "·"}
          </div>
        )}
      </div>
      <div className="space-y-0.5 px-2.5 pt-2 pb-3">
        <p className="line-clamp-2 text-[12px] leading-snug font-bold text-ink">
          {name}
        </p>
        <p className="text-[10px] font-medium text-muted">{unit}</p>
        <p className="text-[13px] font-extrabold text-forest">₹{price}</p>
      </div>
    </article>
  );
}
