"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DEFAULT_MAP_CENTER,
  getGoogleMapsApiKey,
} from "@/lib/live-track-map";
import {
  reverseGeocodeLatLng,
  type DetectedPlace,
} from "@/lib/saved-addresses";

const MAP_CONTAINER = { width: "100%", height: "100%" } as const;

type LatLng = { lat: number; lng: number };

function clampLat(v: number) {
  return Math.max(-85, Math.min(85, v));
}

function clampLng(v: number) {
  return ((v + 540) % 360) - 180;
}

/**
 * Interactive Google Map for the address sheet.
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with Maps JavaScript API enabled.
 */
export function AddressLocationMap({
  place,
  resolving,
  onResolving,
  onPlace,
  onNotice,
  className,
}: {
  place: DetectedPlace | null;
  resolving: boolean;
  onResolving: (busy: boolean) => void;
  onPlace: (place: DetectedPlace) => void;
  onNotice: (message: string | null) => void;
  className?: string;
}) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: "yaadro-address-map",
    googleMapsApiKey: apiKey ?? "",
  });

  const initial = useMemo<LatLng>(() => {
    if (
      typeof place?.lat === "number" &&
      typeof place?.lng === "number" &&
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng)
    ) {
      return { lat: place.lat, lng: place.lng };
    }
    return { ...DEFAULT_MAP_CENTER };
  }, [place?.lat, place?.lng]);

  const [point, setPoint] = useState<LatLng>(initial);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastResolvedKey = useRef("");

  useEffect(() => {
    if (
      typeof place?.lat === "number" &&
      typeof place?.lng === "number" &&
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng)
    ) {
      const next = { lat: place.lat, lng: place.lng };
      setPoint(next);
      mapRef.current?.panTo(next);
      lastResolvedKey.current = `${next.lat.toFixed(5)},${next.lng.toFixed(5)}`;
    }
  }, [place?.lat, place?.lng]);

  const resolvePoint = useCallback(
    async (lat: number, lng: number, notice?: string) => {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (lastResolvedKey.current === key) return;
      lastResolvedKey.current = key;
      onResolving(true);
      onNotice(null);
      const result = await reverseGeocodeLatLng(lat, lng);
      onResolving(false);
      if (!result.ok) {
        onNotice(result.message);
        return;
      }
      onPlace(result.place);
      if (notice) onNotice(notice);
    },
    [onNotice, onPlace, onResolving],
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const next = { lat: clampLat(lat), lng: clampLng(lng) };
      setPoint(next);
      void resolvePoint(next.lat, next.lng, "Pin set — confirm to add details.");
    },
    [resolvePoint],
  );

  if (!apiKey) {
    return (
      <div
        className={cn(
          "relative flex h-52 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[#dce8dc] px-4 text-center ring-1 ring-forest/10",
          className,
        )}
        role="status"
      >
        <div>
          <MapPin className="mx-auto h-10 w-10 text-leaf" aria-hidden />
          <p className="mt-2 text-[13px] font-semibold text-forest">
            Map API not configured
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Set{" "}
            <code className="font-semibold text-ink">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{" "}
            and enable the Maps JavaScript API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-52 overflow-hidden rounded-[1.5rem] bg-[#dce8dc] ring-1 ring-forest/10",
        className,
      )}
    >
      {(!isLoaded || loadError) && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[#eef6ee] px-4 text-center text-[13px] text-muted">
          {loadError ? "Could not load Google Maps." : "Loading map…"}
        </div>
      )}

      {isLoaded && !loadError ? (
        <GoogleMap
          onLoad={onMapLoad}
          mapContainerStyle={MAP_CONTAINER}
          center={point}
          zoom={place?.lat != null ? 16 : 12}
          onClick={onMapClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          }}
        >
          <Marker position={point} draggable onDragEnd={(e) => {
            const lat = e.latLng?.lat();
            const lng = e.latLng?.lng();
            if (typeof lat !== "number" || typeof lng !== "number") return;
            const next = { lat: clampLat(lat), lng: clampLng(lng) };
            setPoint(next);
            void resolvePoint(
              next.lat,
              next.lng,
              "Pin set — confirm to add details.",
            );
          }} />
        </GoogleMap>
      ) : null}

      {(resolving || !isLoaded) && !loadError ? (
        <div className="pointer-events-none absolute top-3 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-forest shadow ring-1 ring-forest/10">
          {resolving ? "Resolving address…" : "Loading map…"}
        </div>
      ) : null}
    </div>
  );
}

/** Locate control styled for the address sheet (parent owns detect logic). */
export function AddressLocateButton({
  detecting,
  onDetect,
  className,
}: {
  detecting: boolean;
  onDetect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onDetect}
      disabled={detecting}
      aria-label="Detect my location"
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full bg-white text-forest shadow-md ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-70",
        className,
      )}
    >
      <LocateFixed
        className={cn("h-5 w-5", detecting && "animate-pulse")}
        aria-hidden
      />
    </button>
  );
}
