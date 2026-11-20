"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  HOME_SEARCH_SAMPLE_TERMS,
  HomeSearchPlaceholder,
  type SearchPlaceholderMotion,
} from "@/components/home/HomeSearchPlaceholder";

export {
  HOME_SEARCH_PLACEHOLDER_SAMPLES,
  HOME_SEARCH_SAMPLE_TERMS,
  SEARCH_PLACEHOLDER_MOTION_OPTIONS,
  type SearchPlaceholderMotion,
} from "@/components/home/HomeSearchPlaceholder";

type HomeSearchBarProps = {
  className?: string;
  /**
   * When true, submit navigates to `/categories?q=…` (filters products there).
   */
  navigateOnSubmit?: boolean;
  placeholder?: string;
  /**
   * Gateway slideshow terms (without the Search "…" wrapper for word/typewriter).
   * Full phrases still work for fade/tick/blur/scale via derived display.
   */
  placeholderSamples?: readonly string[];
  /** Sample terms for word / typewriter (preferred). Defaults from samples. */
  placeholderTerms?: readonly string[];
  /** Hint motion when samples/terms are set. Default `typewriter`. */
  placeholderMotion?: SearchPlaceholderMotion;
  /** ms between sample swaps / typewriter pause. Default 1400 for typewriter, 2600 otherwise. */
  placeholderIntervalMs?: number;
  /** Opens filters (categories browser / hub). */
  onFilterClick?: () => void;
  /** Navigate when filter is tapped (e.g. home → categories with chips open). */
  filterHref?: string;
  /** Shows a red badge on the filter chip when facets are active. */
  filterActive?: boolean;
  /** When the filter chip row is expanded under the search bar. */
  filterExpanded?: boolean;
  /**
   * Gateway mode: focus / click opens categories search (or custom handler)
   * instead of typing on home.
   */
  onActivate?: () => void;
  /** Default destination when `onActivate` omitted and gateway is enabled via href. */
  activateHref?: string;
  /** Controlled query (categories hub). */
  value?: string;
  onChange?: (q: string) => void;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputId?: string;
};

function termsFromSamples(samples: readonly string[]): string[] {
  return samples.map((sample) => {
    const match = /"([^"]+)"/.exec(sample);
    if (match?.[1]) return match[1];
    return sample.replace(/^Search\s+/i, "").replace(/^["']|["']$/g, "");
  });
}

/**
 * Shared search pill: magnifier + field + green filter chip.
 * Home gateway → categories (optional rotating samples); hub uses typing.
 */
export function HomeSearchBar({
  className,
  navigateOnSubmit = false,
  placeholder = "Type to search",
  placeholderSamples,
  placeholderTerms,
  placeholderMotion = "typewriter",
  placeholderIntervalMs,
  onFilterClick,
  filterHref,
  filterActive = false,
  filterExpanded,
  onActivate,
  activateHref,
  value: valueProp,
  onChange,
  autoFocus = false,
  inputRef: inputRefProp,
  inputId,
}: HomeSearchBarProps) {
  const router = useRouter();
  const reactId = useId();
  const id = inputId ?? `home-search-${reactId}`;
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = inputRefProp ?? localRef;
  const [internalQuery, setInternalQuery] = useState("");
  const isControlled = valueProp !== undefined;
  const query = isControlled ? valueProp : internalQuery;
  const isGateway = Boolean(onActivate || activateHref);

  const terms =
    placeholderTerms && placeholderTerms.length > 0
      ? placeholderTerms
      : placeholderSamples && placeholderSamples.length > 0
        ? termsFromSamples(placeholderSamples)
        : null;

  useEffect(() => {
    if (!autoFocus || isGateway) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [autoFocus, isGateway, inputRef]);

  const setQuery = (next: string) => {
    if (!isControlled) setInternalQuery(next);
    onChange?.(next);
  };

  const goActivate = () => {
    if (onActivate) {
      onActivate();
      return;
    }
    if (activateHref) router.push(activateHref);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isGateway) {
      goActivate();
      return;
    }
    const q = query.trim();
    if (!q || !navigateOnSubmit) return;
    router.push(
      `/categories?q=${encodeURIComponent(q)}&focus=search&cat=all`,
    );
  };

  // Gateway always shows the hint; editable bars show it only while empty.
  const showSlideshow = Boolean(
    terms && terms.length > 0 && (isGateway || !query.trim()),
  );
  const intervalMs =
    placeholderIntervalMs ??
    (placeholderMotion === "typewriter" ? 1400 : 2600);

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cn("w-full", className)}
    >
      <label className="sr-only" htmlFor={id}>
        Search products
      </label>
      <div className="flex h-14 items-center gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-4 shadow-[0_10px_28px_rgba(47,107,47,0.14)] ring-1 ring-black/[0.04]">
        <Search
          className="h-[22px] w-[22px] shrink-0 text-black"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="search"
            name="q"
            value={isGateway ? "" : query}
            readOnly={isGateway}
            onChange={(e) => {
              if (!isGateway) setQuery(e.target.value);
            }}
            onFocus={() => {
              if (isGateway) goActivate();
            }}
            onClick={() => {
              if (isGateway) goActivate();
            }}
            placeholder={showSlideshow ? "" : placeholder}
            autoComplete="off"
            enterKeyHint="search"
            className={cn(
              "w-full bg-transparent text-[15px] font-medium text-black outline-none placeholder:font-normal placeholder:text-black/55",
              isGateway ? "cursor-pointer" : "cursor-text",
            )}
          />
          {showSlideshow ? (
            <HomeSearchPlaceholder
              terms={terms ?? HOME_SEARCH_SAMPLE_TERMS}
              motion={placeholderMotion}
              intervalMs={intervalMs}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            if (onFilterClick) {
              onFilterClick();
              return;
            }
            if (filterHref) router.push(filterHref);
          }}
          aria-label="Filters"
          aria-pressed={filterActive || undefined}
          aria-expanded={filterExpanded}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf active:scale-95"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          {filterActive ? (
            <span
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </button>
      </div>
    </form>
  );
}
