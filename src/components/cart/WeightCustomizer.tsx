"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { CloseButton } from "@/components/navigation/CloseButton";
import { useCart } from "@/components/cart/CartContext";

function subscribeNever() {
  return () => undefined;
}

/**
 * Weight customizer sheet (reference-style): opens for products that
 * carry the custom weight option. A scrollable tick ruler snaps in
 * 0.5 kg steps under a fixed centre pointer; price updates live.
 * Mounted once inside CartProvider (storefront layout).
 */
const STEP_W = 56;

function fmtKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

export function WeightCustomizer() {
  const { customizing, setCustomizing, getItem, setWeight } = useCart();
  const [selectedKg, setSelectedKg] = useState(1);
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const rulerRef = useRef<HTMLDivElement>(null);

  const product = customizing;
  const existing = product ? getItem(product.id) : undefined;

  // Initialise selection + ruler position whenever a product opens.
  useEffect(() => {
    if (!product?.customization) return;
    const { minKg, maxKg, stepKg } = product.customization;
    const initial = Math.min(
      maxKg,
      Math.max(minKg, existing?.weightKg ?? 1),
    );
    const index = Math.round((initial - minKg) / stepKg);
    const raf = requestAnimationFrame(() => {
      setSelectedKg(initial);
      if (rulerRef.current) rulerRef.current.scrollLeft = index * STEP_W;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Scroll lock + Escape while open.
  useEffect(() => {
    if (!product) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomizing(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [product, setCustomizing]);

  if (!mounted || !product?.customization) return null;
  const { minKg, maxKg, stepKg } = product.customization;
  const steps: number[] = [];
  for (let kg = minKg; kg <= maxKg + 0.001; kg += stepKg) {
    steps.push(Math.round(kg * 10) / 10);
  }
  const total = Math.round(selectedKg * product.price);

  const handleScroll = () => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const index = Math.max(
      0,
      Math.min(steps.length - 1, Math.round(ruler.scrollLeft / STEP_W)),
    );
    const kg = steps[index];
    if (kg !== selectedKg) setSelectedKg(kg);
  };

  // Portal to body so overflow/clip on DemoFrame / playground main cannot trap the sheet.
  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Choose weight for ${product.name}`}>
      <button
        type="button"
        aria-label="Close weight selector"
        onClick={() => setCustomizing(null)}
        className="absolute inset-0 h-full w-full cursor-default bg-track/45 backdrop-blur-[2px]"
      />
      <div className="sheet-rise absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-[2rem] bg-paper px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-24px_48px_rgba(47,107,47,0.35)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-forest/15" aria-hidden />

        <div className="flex items-center gap-3">
          <Image
            src={product.image}
            alt=""
            width={112}
            height={112}
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold text-ink">{product.name}</h2>
            <p className="text-xs font-medium text-muted">
              By weight, ₹{product.price} / kg
            </p>
          </div>
          <p className="text-lg font-extrabold text-black">₹{total}</p>
          <CloseButton onClick={() => setCustomizing(null)} />
        </div>

        {/* Tick ruler: scroll to slide weights under the centre pointer */}
        <div className="relative mt-5">
          <div
            className="pointer-events-none absolute top-0 left-1/2 z-10 h-16 w-[3px] -translate-x-1/2 rounded-full bg-leaf"
            aria-hidden
          />
          <div
            ref={rulerRef}
            onScroll={handleScroll}
            className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <div
              className="flex w-max"
              style={{
                paddingLeft: "calc(50% - 1.75rem)",
                paddingRight: "calc(50% - 1.75rem)",
              }}
            >
              {steps.map((kg) => {
                const isWhole = Number.isInteger(kg);
                const isSelected = kg === selectedKg;
                return (
                  <div
                    key={kg}
                    className="flex w-14 shrink-0 flex-col items-center"
                    style={{ scrollSnapAlign: "center" }}
                  >
                    <span
                      className={`w-[2px] rounded-full transition-all ${
                        isSelected
                          ? "h-10 bg-leaf"
                          : isWhole
                            ? "h-8 bg-forest/35"
                            : "h-5 bg-forest/20"
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`mt-2 text-[11px] font-semibold ${
                        isSelected ? "text-leaf" : "text-muted"
                      }`}
                    >
                      {isWhole ? kg : "·"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[26px] font-extrabold text-ink" aria-live="polite">
          {fmtKg(selectedKg)} kg
        </p>

        <button
          type="button"
          onClick={() => {
            setWeight(product.id, selectedKg);
            setCustomizing(null);
          }}
          className="mt-4 h-12 w-full cursor-pointer rounded-full bg-track text-sm font-semibold text-black shadow-[0_10px_24px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          {existing?.weightKg ? "Save changes" : "Add to basket"} • ₹{total}
        </button>
        {existing?.weightKg ? (
          <button
            type="button"
            onClick={() => {
              setWeight(product.id, null);
              setCustomizing(null);
            }}
            className="mt-2 h-10 w-full cursor-pointer text-sm font-semibold text-red-600 transition hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Remove from basket
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
