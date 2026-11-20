"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Terms cycled inside gateway search hints. */
export const HOME_SEARCH_SAMPLE_TERMS = [
  "milk",
  "bread",
  "eggs",
  "rice",
  "fruits",
] as const;

/** Full phrases — default for fade / tick / blur / scale. */
export const HOME_SEARCH_PLACEHOLDER_SAMPLES = HOME_SEARCH_SAMPLE_TERMS.map(
  (term) => `Search "${term}"`,
);

export type SearchPlaceholderMotion =
  | "fade"
  | "tick"
  | "blur"
  | "scale"
  | "word"
  | "typewriter";

export const SEARCH_PLACEHOLDER_MOTION_OPTIONS: {
  id: SearchPlaceholderMotion;
  label: string;
  blurb: string;
}[] = [
  {
    id: "fade",
    label: "Fade",
    blurb: "Simple opacity crossfade (current live default).",
  },
  {
    id: "tick",
    label: "Vertical tick",
    blurb: "Outgoing slides up; next slides in from below.",
  },
  {
    id: "blur",
    label: "Crossfade + blur",
    blurb: "Soft blur with opacity — calmer than a hard cut.",
  },
  {
    id: "scale",
    label: "Scale whisper",
    blurb: "Fade with a slight scale-in.",
  },
  {
    id: "word",
    label: "Word swap",
    blurb: 'Fixed “Search ” — only the quoted term animates.',
  },
  {
    id: "typewriter",
    label: "Typewriter",
    blurb: "Types the term, pauses, erases, then next.",
  },
];

type HomeSearchPlaceholderProps = {
  terms?: readonly string[];
  motion?: SearchPlaceholderMotion;
  /** Hold / cycle period. Typewriter uses this as pause after typing. */
  intervalMs?: number;
  className?: string;
};

/**
 * Gateway-only rotating hint overlay inside the search pill.
 */
export function HomeSearchPlaceholder({
  terms = HOME_SEARCH_SAMPLE_TERMS,
  motion = "fade",
  intervalMs = 2600,
  className,
}: HomeSearchPlaceholderProps) {
  const list = terms.length > 0 ? terms : HOME_SEARCH_SAMPLE_TERMS;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [typed, setTyped] = useState("");

  const term = list[index % list.length]!;
  const full = `Search "${term}"`;

  // Fade / tick / blur / scale / word — index cycling
  useEffect(() => {
    if (motion === "typewriter") return;
    if (list.length < 2) return;
    let outTimer = 0;
    const tick = window.setInterval(() => {
      setPhase("out");
      outTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % list.length);
        setPhase("in");
      }, motion === "tick" ? 280 : 220);
    }, intervalMs);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(outTimer);
    };
  }, [list, intervalMs, motion]);

  // Typewriter
  useEffect(() => {
    if (motion !== "typewriter") return;
    let cancelled = false;
    let timer = 0;
    setTyped("");

    const typeNext = (i: number) => {
      if (cancelled) return;
      const current = list[i % list.length]!;
      let char = 0;
      const typeChar = () => {
        if (cancelled) return;
        char += 1;
        setTyped(current.slice(0, char));
        if (char < current.length) {
          timer = window.setTimeout(typeChar, 55);
          return;
        }
        timer = window.setTimeout(erase, intervalMs);
      };
      const erase = () => {
        if (cancelled) return;
        let remaining = current;
        const step = () => {
          if (cancelled) return;
          if (remaining.length <= 0) {
            timer = window.setTimeout(
              () => typeNext((i + 1) % list.length),
              180,
            );
            return;
          }
          remaining = remaining.slice(0, -1);
          setTyped(remaining);
          timer = window.setTimeout(step, 35);
        };
        step();
      };
      typeChar();
    };

    typeNext(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [list, intervalMs, motion]);

  if (motion === "typewriter") {
    return (
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center text-[15px] font-normal text-black/55",
          className,
        )}
      >
        Search &quot;{typed}
        <span className="ml-px inline-block h-[1em] w-px animate-pulse bg-black/40 align-middle" />
        &quot;
      </span>
    );
  }

  if (motion === "word") {
    return (
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center text-[15px] font-normal text-black/55",
          className,
        )}
      >
        <span>Search&nbsp;</span>
        <span className="relative inline-grid overflow-hidden">
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[opacity,transform] duration-300 ease-out",
              phase === "in"
                ? "translate-y-0 opacity-100"
                : "-translate-y-2 opacity-0",
            )}
          >
            &quot;{term}&quot;
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[15px] font-normal text-black/55",
        className,
      )}
    >
      <span
        className={cn(
          "transition-[opacity,transform,filter] duration-300 ease-out will-change-[opacity,transform,filter]",
          motion === "fade" &&
            (phase === "in" ? "opacity-100" : "opacity-0"),
          motion === "tick" &&
            (phase === "in"
              ? "translate-y-0 opacity-100"
              : "-translate-y-2.5 opacity-0"),
          motion === "blur" &&
            (phase === "in"
              ? "opacity-100 blur-0"
              : "opacity-0 blur-[2px]"),
          motion === "scale" &&
            (phase === "in"
              ? "scale-100 opacity-100"
              : "scale-[0.98] opacity-0"),
        )}
      >
        {full}
      </span>
    </span>
  );
}
