"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type TomatoVineLoaderProps = {
  className?: string;
  /** Full label typed out under the image (loops). */
  label?: string;
  /** Image box size. */
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: { className: "h-28 w-28", px: 112 },
  md: { className: "h-36 w-36", px: 144 },
  lg: { className: "h-44 w-44", px: 176 },
} as const;

/**
 * Softened animated WebP (2× + AA blur from the source GIF).
 * GIF kept as fallback only.
 */
export const TOMATO_VINE_LOADER_SRC = "/loaders/tomato-vine.webp";

const TYPE_MS = 55;
const HOLD_MS = 1200;
const CLEAR_MS = 28;

/**
 * Happy tomato vine loader — soft edges + typewriter label.
 * Playground-first; wire to category PLP Suspense when approved.
 */
export function TomatoVineLoader({
  className,
  label = "Loading…",
  size = "md",
}: TomatoVineLoaderProps) {
  const box = SIZE[size];
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(label);
      return;
    }

    let cancelled = false;
    let timer = 0;
    let i = 0;
    let phase: "type" | "hold" | "clear" = "type";

    const tick = () => {
      if (cancelled) return;
      if (phase === "type") {
        i += 1;
        setTyped(label.slice(0, i));
        if (i >= label.length) {
          phase = "hold";
          timer = window.setTimeout(tick, HOLD_MS);
          return;
        }
        timer = window.setTimeout(tick, TYPE_MS);
        return;
      }
      if (phase === "hold") {
        phase = "clear";
        timer = window.setTimeout(tick, CLEAR_MS);
        return;
      }
      i = Math.max(0, i - 1);
      setTyped(label.slice(0, i));
      if (i <= 0) {
        phase = "type";
        timer = window.setTimeout(tick, 320);
        return;
      }
      timer = window.setTimeout(tick, CLEAR_MS);
    };

    setTyped("");
    i = 0;
    phase = "type";
    timer = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [label]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3.5",
        className,
      )}
    >
      <div
        className="relative grid place-items-center rounded-[2rem] p-2"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(232,245,233,0.98) 0%, rgba(245,249,246,0.7) 52%, transparent 74%)",
        }}
      >
        {/* Ambient glow so hard silhouette never sits on flat paper */}
        <div
          className="pointer-events-none absolute inset-[10%] rounded-full opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(185,220,188,0.75) 0%, transparent 68%)",
          }}
          aria-hidden
        />

        {/* Soft bloom plate — blurred twin dissolves pixel edges */}
        <Image
          src={TOMATO_VINE_LOADER_SRC}
          alt=""
          width={box.px}
          height={box.px}
          unoptimized
          aria-hidden
          className={cn(
            box.className,
            "pointer-events-none absolute z-0 scale-[1.06] object-contain opacity-55 blur-[2.5px]",
          )}
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Crisp-enough front with light AA soften */}
        <Image
          src={TOMATO_VINE_LOADER_SRC}
          alt=""
          width={box.px}
          height={box.px}
          unoptimized
          priority
          className={cn(
            box.className,
            "relative z-[1] object-contain [image-rendering:auto]",
          )}
          style={{
            mixBlendMode: "multiply",
            filter: "contrast(1.02) saturate(1.04) blur(0.45px)",
          }}
        />
      </div>

      <p
        className="min-h-[1.25rem] text-[13px] font-bold tracking-wide text-forest"
        aria-hidden
      >
        {typed}
        <span className="tvl-caret ml-0.5 inline-block w-[0.45ch] translate-y-px border-r-2 border-forest/70" />
      </p>

      <style>{`
        @keyframes tvl-caret-blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .tvl-caret {
          animation: tvl-caret-blink 0.9s steps(1, end) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tvl-caret { animation: none; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
