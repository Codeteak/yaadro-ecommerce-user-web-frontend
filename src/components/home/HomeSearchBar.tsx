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

type HomeSearchBarProps = {
  className?: string;
  /**
   * When true, submit navigates to `/search?q=…`.
   * Default false until a search page/API exists.
   */
  navigateOnSubmit?: boolean;
  placeholder?: string;
  /** Filter control — UI stub until filters exist. */
  onFilterClick?: () => void;
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

/**
 * Shared search pill: magnifier + field + green filter chip.
 * Home gateway → categories; hub uses controlled typing.
 */
export function HomeSearchBar({
  className,
  navigateOnSubmit = false,
  placeholder = "Type to search",
  onFilterClick,
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
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

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
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 cursor-text bg-transparent text-[15px] font-medium text-black outline-none placeholder:font-normal placeholder:text-black/55"
        />
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="Filters"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf active:scale-95"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </form>
  );
}
