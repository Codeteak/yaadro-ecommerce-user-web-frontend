"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_JS_LOADER,
} from "@/lib/live-track-map";
import {
  detectedPlaceFromComponents,
  geocodeSearchQuery,
  type DetectedPlace,
} from "@/lib/saved-addresses";

type Suggestion = {
  id: string;
  primary: string;
  secondary: string;
  description: string;
  placeId?: string;
};

function splitDescription(
  description: string,
): Pick<Suggestion, "primary" | "secondary"> {
  const [primary, ...rest] = description.split(",").map((part) => part.trim());
  return {
    primary: primary || description,
    secondary: rest.join(", "),
  };
}

/** Location search with Places suggestions — no Search button. */
export function AddressSearchField({
  value,
  onChange,
  onSelectPlace,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (place: DetectedPlace) => void;
  disabled?: boolean;
  id?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  /** After a pick, ignore suggestion fetches until the shopper edits the field. */
  const [locked, setLocked] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [emptyHint, setEmptyHint] = useState<string | null>(null);

  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_JS_LOADER.id,
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_JS_LOADER.libraries,
  });

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const canSuggest =
    !disabled && !picking && !locked && value.trim().length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!canSuggest) {
      // Clear via timeout — avoid synchronous setState in the effect body.
      const clearTimer = window.setTimeout(() => {
        setSuggestions([]);
        setLoading(false);
        setEmptyHint(null);
        setOpen(false);
        setActiveIndex(-1);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const q = value.trim();
    const req = ++requestId.current;
    // Loading flag also deferred so the effect body stays free of sync setState.
    const loadTimer = window.setTimeout(() => setLoading(true), 0);
    debounceRef.current = setTimeout(() => {
      if (
        isLoaded &&
        apiKey &&
        typeof window !== "undefined" &&
        window.google?.maps?.places
      ) {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: q,
            componentRestrictions: { country: "in" },
          },
          (predictions, status) => {
            if (req !== requestId.current) return;

            if (
              status !== window.google.maps.places.PlacesServiceStatus.OK ||
              !predictions?.length
            ) {
              setSuggestions([]);
              setEmptyHint(
                status ===
                  window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                  ? "No matching places"
                  : null,
              );
              setLoading(false);
              setOpen(true);
              return;
            }

            setSuggestions(
              predictions.slice(0, 5).map((prediction) => {
                const primary =
                  prediction.structured_formatting?.main_text ||
                  splitDescription(prediction.description).primary;
                const secondary =
                  prediction.structured_formatting?.secondary_text ||
                  splitDescription(prediction.description).secondary;
                return {
                  id: prediction.place_id,
                  placeId: prediction.place_id,
                  primary,
                  secondary,
                  description: prediction.description,
                };
              }),
            );
            setEmptyHint(null);
            setLoading(false);
            setOpen(true);
            setActiveIndex(-1);
          },
        );
        return;
      }

      if (req !== requestId.current) return;
      setSuggestions([
        {
          id: `query:${q}`,
          primary: q,
          secondary: "Use this search",
          description: q,
        },
      ]);
      setEmptyHint(null);
      setLoading(false);
      setOpen(true);
      setActiveIndex(0);
    }, 260);

    return () => {
      window.clearTimeout(loadTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [apiKey, canSuggest, isLoaded, value]);

  const showList =
    open &&
    canSuggest &&
    (suggestions.length > 0 || loading || Boolean(emptyHint));

  const clearField = () => {
    setLocked(false);
    onChange("");
    setSuggestions([]);
    setOpen(false);
    setEmptyHint(null);
    setActiveIndex(-1);
  };

  const resolveSuggestion = async (suggestion: Suggestion) => {
    setLocked(true);
    requestId.current += 1;
    setPicking(true);
    setOpen(false);
    setSuggestions([]);
    setEmptyHint(null);
    setActiveIndex(-1);
    setLoading(false);
    onChange(suggestion.primary);

    try {
      if (
        suggestion.placeId &&
        typeof window !== "undefined" &&
        window.google?.maps
      ) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({
          placeId: suggestion.placeId,
        });
        const top = response.results?.[0];
        const lat = top?.geometry?.location?.lat();
        const lng = top?.geometry?.location?.lng();
        if (typeof lat === "number" && typeof lng === "number" && top) {
          onSelectPlace(
            detectedPlaceFromComponents(
              top.address_components?.map((c) => ({
                long_name: c.long_name,
                types: [...c.types],
              })),
              {
                latitude: lat,
                longitude: lng,
                formatted: top.formatted_address ?? suggestion.description,
                fallbackArea: suggestion.primary,
              },
            ),
          );
          return;
        }
      }

      const result = await geocodeSearchQuery(suggestion.description);
      if (!result.ok) {
        setLocked(false);
        setEmptyHint(result.message);
        setOpen(true);
        return;
      }
      onSelectPlace(result.place);
    } catch {
      setLocked(false);
      setEmptyHint("Couldn't open that place — try another.");
      setOpen(true);
    } finally {
      setPicking(false);
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="relative z-20 pt-0.5">
      <label
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-full border border-forest/15 bg-white px-3.5",
          "shadow-[0_2px_10px_rgba(47,107,47,0.06)]",
          "focus-within:border-leaf/55 focus-within:shadow-[0_4px_16px_rgba(47,107,47,0.12)]",
          disabled && "opacity-60",
        )}
      >
        <Search
          className="h-4 w-4 shrink-0 text-forest/45"
          strokeWidth={2.25}
          aria-hidden
        />
        <input
          id={id}
          value={value}
          onChange={(e) => {
            setLocked(false);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (!locked && (suggestions.length > 0 || emptyHint)) {
              setOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (!showList || suggestions.length === 0) {
              if (e.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              const picked = suggestions[activeIndex];
              if (picked) void resolveSuggestion(picked);
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Search city, area, street…"
          disabled={disabled || picking}
          aria-label="Search location"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          role="combobox"
          autoComplete="off"
          className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted/70 disabled:opacity-60"
        />
        {value && !disabled && !picking ? (
          <button
            type="button"
            onClick={clearField}
            aria-label="Clear search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-ink"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : null}
        {loading || picking ? (
          <span
            className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-leaf/40"
            aria-hidden
          />
        ) : null}
      </label>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-[0_14px_32px_rgba(47,107,47,0.16)]"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-4 py-3.5 text-[13px] text-muted">
              Looking up places…
            </li>
          ) : null}
          {emptyHint && suggestions.length === 0 ? (
            <li className="px-4 py-3.5 text-[13px] text-muted">{emptyHint}</li>
          ) : null}
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            const last = index === suggestions.length - 1;
            return (
              <li key={suggestion.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void resolveSuggestion(suggestion)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3.5 py-3 text-left transition",
                    !last && "border-b border-forest/8",
                    active ? "bg-mint/55" : "hover:bg-paper",
                  )}
                >
                  <span
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-forest/65"
                    aria-hidden
                  >
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block truncate text-[13px] font-bold text-black">
                      {suggestion.primary}
                    </span>
                    {suggestion.secondary ? (
                      <span className="mt-0.5 block truncate text-[12px] leading-4 text-muted">
                        {suggestion.secondary}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Primary Detect my location CTA (map + details). */
export function AddressDetectButton({
  detecting,
  disabled,
  onDetect,
  className,
}: {
  detecting: boolean;
  disabled?: boolean;
  onDetect: () => void;
  className?: string;
}) {
  const busy = detecting || disabled;

  return (
    <button
      type="button"
      onClick={onDetect}
      disabled={busy}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left",
        "shadow-[0_6px_18px_rgba(47,107,47,0.1)] ring-1 ring-forest/12",
        "transition hover:ring-leaf/35 hover:shadow-[0_8px_22px_rgba(47,107,47,0.14)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
        "disabled:cursor-wait disabled:opacity-70",
        className,
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-track text-black",
          "shadow-[0_4px_0_0_rgba(31,92,31,0.25)] transition",
          "group-hover:bg-leaf-bright",
          detecting && "animate-pulse",
        )}
        aria-hidden
      >
        <LocateFixed className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-black">
          {detecting ? "Detecting your location…" : "Detect my location"}
        </span>
        <span className="mt-0.5 block text-[12px] leading-4 text-muted">
          {detecting
            ? "Allow location access if prompted"
            : "Use GPS for a precise pin — works best outdoors"}
        </span>
      </span>
    </button>
  );
}
