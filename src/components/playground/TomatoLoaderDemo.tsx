"use client";

import { useState } from "react";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { TomatoVineLoader } from "@/components/ui/TomatoVineLoader";
import { cn } from "@/lib/cn";

/**
 * Playground lab for the tomato vine loader (not wired to ecom yet).
 * Compare standalone vs overlaid on CategoryPlpSkeleton.
 */
export function TomatoLoaderDemo() {
  const [mode, setMode] = useState<"solo" | "plp">("solo");

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Loader preview"
      >
        {(
          [
            ["solo", "Standalone"],
            ["plp", "On category PLP skeleton"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[12px] font-bold transition",
              mode === id
                ? "bg-track text-black shadow-sm"
                : "bg-white text-forest ring-1 ring-forest/15 hover:bg-mint",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "solo" ? (
        <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#eef6ee] to-paper ring-1 ring-black/5">
          <TomatoVineLoader size="lg" label="Loading category…" />
          <p className="mt-2 max-w-[18rem] text-center text-[12px] leading-5 text-muted">
            Soft edges: upscaled AA WebP + bloom layer + typewriter. Asset:{" "}
            <code className="font-semibold text-ink">
              /loaders/tomato-vine.webp
            </code>
            .
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5">
          <CategoryPlpSkeleton className="min-h-[28rem] opacity-55" />
          <div className="absolute inset-0 flex items-center justify-center bg-paper/55 backdrop-blur-[1px]">
            <TomatoVineLoader size="md" label="Loading category…" />
          </div>
        </div>
      )}
    </div>
  );
}
