"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { CatalogMediaTile } from "@/components/product/CatalogMediaTile";
import { ConnectionStatusChip } from "@/components/storefront/ConnectionStatusChip";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { showPopup } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { productPhoto } from "@/lib/product-image";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

type Scenario = "fast" | "3g" | "2g" | "save-data" | "safari" | "offline-weight";

const SCENARIOS: { id: Scenario; label: string; blurb: string }[] = [
  { id: "fast", label: "Fast", blurb: "Full peek + banners" },
  { id: "3g", label: "3G", blurb: "Chip only · full media" },
  { id: "2g", label: "2G", blurb: "Peek 2 · lite media" },
  { id: "save-data", label: "Save-Data", blurb: "Peek 2 · no banner imgs" },
  { id: "safari", label: "Safari", blurb: "No Network API" },
  { id: "offline-weight", label: "Weight", blurb: "Offline Confirm queue" },
];

const WEIGHT_PRODUCT =
  SAMPLE_PRODUCTS.find((p) => p.customization?.type === "weight") ??
  SAMPLE_PRODUCTS[0];

/**
 * Phase 6 polish lab — mirrors live ProductSection peek, OfferBanners lite,
 * WeightCustomizer offline queue. Safari = fast path (no API).
 */
export function LoadingPolishDemo() {
  const [scenario, setScenario] = useState<Scenario>("save-data");
  const [weightKg, setWeightKg] = useState(0.5);
  const [queued, setQueued] = useState(false);

  const policy = useMemo(() => {
    switch (scenario) {
      case "fast":
        return {
          chip: null as null | "slow" | "saver",
          peek: 4,
          liteCards: false,
          liteBanners: false,
          safariNote: false,
          weightMode: false,
        };
      case "3g":
        return {
          chip: "slow" as const,
          peek: 4,
          liteCards: false,
          liteBanners: false,
          safariNote: false,
          weightMode: false,
        };
      case "2g":
        return {
          chip: "slow" as const,
          peek: 2,
          liteCards: true,
          liteBanners: true,
          safariNote: false,
          weightMode: false,
        };
      case "save-data":
        return {
          chip: "saver" as const,
          peek: 2,
          liteCards: true,
          liteBanners: true,
          safariNote: false,
          weightMode: false,
        };
      case "safari":
        return {
          chip: null,
          peek: 4,
          liteCards: false,
          liteBanners: false,
          safariNote: true,
          weightMode: false,
        };
      case "offline-weight":
        return {
          chip: null,
          peek: 2,
          liteCards: true,
          liteBanners: true,
          safariNote: false,
          weightMode: true,
        };
    }
  }, [scenario]);

  const peek = SAMPLE_PRODUCTS.slice(0, policy.peek);

  const confirmWeight = () => {
    if (policy.weightMode) {
      setQueued(true);
      showPopup(
        `Queued: ${WEIGHT_PRODUCT.name} · ${weightKg} kg`,
        "info",
      );
      return;
    }
    setQueued(false);
    showPopup(`Added ${WEIGHT_PRODUCT.name} · ${weightKg} kg`, "success");
  };

  return (
    <DemoFrame
      surface="bare"
      note="Phase 6 polish wired: peek 2 + lite banners on 2g/save-data; Weight Confirm offline queue. Safari stays fast (no connection API)."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="grid grid-cols-3 gap-1 rounded-2xl bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Polish scenario"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scenario === s.id}
              onClick={() => {
                setScenario(s.id);
                setQueued(false);
              }}
              className={cn(
                "rounded-xl px-1.5 py-2 text-left transition",
                scenario === s.id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:bg-mint/40",
              )}
            >
              <span className="block text-[11px] font-extrabold">{s.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[9px] leading-tight font-medium",
                  scenario === s.id ? "text-black/65" : "text-muted",
                )}
              >
                {s.blurb}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-mint/35 px-3 py-2 text-[12px] font-semibold text-forest ring-1 ring-forest/10">
          Peek{" "}
          <span className="font-extrabold">{policy.peek}</span>
          {" · "}
          Cards{" "}
          <span className="font-extrabold">
            {policy.liteCards ? "lite" : "full"}
          </span>
          {" · "}
          Banners{" "}
          <span className="font-extrabold">
            {policy.liteBanners ? "lite" : "full"}
          </span>
        </div>

        <div className="relative h-[min(72vh,38rem)] overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div className="h-full overflow-y-auto overscroll-contain pb-8">
            {policy.chip ? (
              <ConnectionStatusChip kind={policy.chip} className="mt-3" />
            ) : null}

            {policy.safariNote ? (
              <p
                role="status"
                className="mx-3 mt-3 rounded-xl bg-white px-3 py-2 text-center text-[11px] font-semibold text-muted ring-1 ring-forest/10"
              >
                Safari: no{" "}
                <code className="rounded bg-mint/40 px-1">navigator.connection</code>
                {" — "}
                treat as fast (no chip / no lite). Offline still works via{" "}
                <code className="rounded bg-mint/40 px-1">online</code> events.
              </p>
            ) : null}

            <section className="px-4 pt-4">
              <p className="text-[11px] font-bold tracking-wide text-muted uppercase">
                Offer banners
              </p>
              <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-forest/10">
                {policy.liteBanners ? (
                  <div className="flex h-28 flex-col items-center justify-center gap-1 bg-gradient-to-br from-mint via-[#d4efd4] to-track/40 px-4 text-center">
                    <p className="text-[13px] font-extrabold text-forest">
                      Fresh picks of the day
                    </p>
                    <p className="text-[11px] font-medium text-forest/70">
                      Lite banner — no photo bytes
                    </p>
                  </div>
                ) : (
                  <div className="relative h-28">
                    <CatalogImage
                      src="/categories/fruits.jpg"
                      alt=""
                      fill
                      className="object-cover"
                      sizes="400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <p className="absolute bottom-3 left-3 text-[13px] font-extrabold text-white">
                      Fresh picks of the day
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="px-4 pt-4">
              <div className="flex items-end justify-between">
                <h3 className="text-[15px] font-extrabold text-forest">
                  Essentials
                </h3>
                <span className="text-[10px] font-bold tracking-wide text-muted uppercase">
                  {policy.peek} peek
                </span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {peek.map((product, i) => (
                  <li key={product.id}>
                    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-forest/10">
                      <div className="relative aspect-square">
                        {policy.liteCards ? (
                          <CatalogMediaTile
                            name={product.name}
                            seed={product.id}
                          />
                        ) : (
                          <CatalogImage
                            src={productPhoto(product.image)}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="160px"
                          />
                        )}
                      </div>
                      <div className="space-y-0.5 px-2.5 pt-2 pb-3">
                        <p className="line-clamp-2 text-[12px] font-bold text-ink">
                          {product.name}
                        </p>
                        <p className="text-[13px] font-extrabold text-forest">
                          ₹{product.price}
                        </p>
                        {i === 0 && product.customization ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted">
                            <Scale className="size-3" aria-hidden />
                            By weight
                          </span>
                        ) : null}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>

            {policy.weightMode ? (
              <section className="mx-3 mt-5 rounded-2xl bg-white p-4 ring-1 ring-forest/10 shadow-[0_8px_24px_rgba(47,107,47,0.08)]">
                <p className="text-[12px] font-bold tracking-wide text-muted uppercase">
                  Weight Confirm (offline)
                </p>
                <p className="mt-1 text-[14px] font-extrabold text-forest">
                  {WEIGHT_PRODUCT.name}
                </p>
                <div className="mt-3 flex gap-2">
                  {[0.5, 1, 1.5, 2].map((kg) => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => setWeightKg(kg)}
                      className={cn(
                        "flex-1 rounded-full py-2 text-[12px] font-bold ring-1 transition",
                        weightKg === kg
                          ? "bg-track text-black ring-leaf/40"
                          : "bg-paper text-forest ring-forest/10",
                      )}
                    >
                      {kg} kg
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={confirmWeight}
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-track text-sm font-bold text-black"
                >
                  Confirm {weightKg} kg
                </button>
                {queued ? (
                  <p className="mt-2 text-center text-[11px] font-semibold text-amber-900">
                    Queued — will toast “Synced…” on reconnect
                  </p>
                ) : (
                  <p className="mt-2 text-center text-[11px] font-medium text-muted">
                    Live WeightCustomizer does not enqueue yet — this is the
                    proposed wire.
                  </p>
                )}
              </section>
            ) : null}
          </div>
        </div>

        <ol className="space-y-1.5 rounded-2xl bg-paper px-4 py-3 text-[11px] leading-4 text-muted ring-1 ring-forest/10">
          <li>
            <span className="font-bold text-forest">A.</span> 2G / Save-Data peek
            count 4 → 2 on home All strip.
          </li>
          <li>
            <span className="font-bold text-forest">B.</span> Lite offer banners
            (gradient + copy, no{" "}
            <code className="rounded bg-mint/50 px-1">CatalogImage</code>).
          </li>
          <li>
            <span className="font-bold text-forest">C.</span> Weight Confirm →{" "}
            <code className="rounded bg-mint/50 px-1">enqueueOfflineAction</code>{" "}
            when offline.
          </li>
          <li>
            <span className="font-bold text-forest">D.</span> Safari: keep fast
            path; document only (no fake connection API).
          </li>
          <li>
            <span className="font-bold text-forest">Live:</span> A–C on ecom · D
            is the default Safari path (nothing to wire).
          </li>
        </ol>
      </div>
    </DemoFrame>
  );
}
