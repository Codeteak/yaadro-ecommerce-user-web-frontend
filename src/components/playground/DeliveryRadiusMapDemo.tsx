"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MapPin, Navigation } from "lucide-react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { haversineMeters } from "@/lib/db/haversine";
import {
  boundsForDeliveryRadius,
  circleRingPath,
  dashedRingOptions,
  DELIVERY_RADIUS_MAP_STYLE,
  type MapLatLng,
} from "@/lib/delivery-radius-map";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_JS_LOADER,
  SAMPLE_LIVE_MAP,
} from "@/lib/live-track-map";

const MAP_STYLE = { width: "100%", height: "100%" } as const;

/** Sample shop hub + 5 km (playground preview; live uses getShopDeliveryHub). */
const SAMPLE_HUB = SAMPLE_LIVE_MAP.origin;
const SAMPLE_RADIUS_M = 5_000;

const INSIDE_PIN = {
  lat: SAMPLE_HUB.lat + 0.012,
  lng: SAMPLE_HUB.lng - 0.008,
};

const OUTSIDE_PIN = {
  lat: SAMPLE_HUB.lat + 0.06,
  lng: SAMPLE_HUB.lng + 0.04,
};

type LatLng = MapLatLng;

/**
 * Playground preview of the live address-map radius circle.
 * Shop hub pin is always shown; delivery status only after a customer pin.
 */
export function DeliveryRadiusMapDemo() {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_JS_LOADER.id,
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_JS_LOADER.libraries,
  });

  /** `null` = no customer pin yet (same empty state as live). */
  const [pin, setPin] = useState<LatLng | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const hasCustomerPin = pin != null;
  const distanceM = useMemo(() => {
    if (!pin) return null;
    return Math.round(
      haversineMeters(pin.lat, pin.lng, SAMPLE_HUB.lat, SAMPLE_HUB.lng),
    );
  }, [pin]);
  const inside =
    distanceM != null ? distanceM <= SAMPLE_RADIUS_M : null;

  const fitMap = useCallback((nextPin: LatLng | null) => {
    const map = mapRef.current;
    if (!map || typeof google === "undefined") return;
    map.fitBounds(
      boundsForDeliveryRadius(SAMPLE_HUB, SAMPLE_RADIUS_M, nextPin),
      { top: 56, right: 48, bottom: 48, left: 48 },
    );
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.fitBounds(boundsForDeliveryRadius(SAMPLE_HUB, SAMPLE_RADIUS_M, null), {
      top: 56,
      right: 48,
      bottom: 48,
      left: 48,
    });
  }, []);

  useEffect(() => {
    fitMap(pin);
  }, [pin, fitMap]);

  const setPinAndFit = useCallback(
    (next: LatLng | null) => {
      setPin(next);
      fitMap(next);
    },
    [fitMap],
  );

  const onDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;
      setPinAndFit({ lat, lng });
    },
    [setPinAndFit],
  );

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;
      setPinAndFit({ lat, lng });
    },
    [setPinAndFit],
  );

  const style =
    inside === false
      ? DELIVERY_RADIUS_MAP_STYLE.outside
      : DELIVERY_RADIUS_MAP_STYLE.inside;

  const circleOptions = useMemo(
    () => ({
      strokeOpacity: 0,
      strokeWeight: 0,
      fillColor: style.fill,
      fillOpacity: style.fillOpacity,
      clickable: false,
      draggable: false,
      editable: false,
      zIndex: 1,
    }),
    [style.fill, style.fillOpacity],
  );

  const ringPath = useMemo(
    () => circleRingPath(SAMPLE_HUB, SAMPLE_RADIUS_M),
    [],
  );

  const ringOptions = useMemo(
    () => dashedRingOptions(style.stroke),
    [style.stroke],
  );

  return (
    <DemoFrame note="Same radius styles as live address map: darker fill, thin light dotted ring.">
      <div className="space-y-3 bg-gradient-to-b from-mint to-paper px-4 pt-4 pb-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPinAndFit(null)}
            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-forest ring-1 ring-forest/15"
          >
            Clear pin
          </button>
          <button
            type="button"
            onClick={() => setPinAndFit(INSIDE_PIN)}
            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-forest ring-1 ring-forest/15"
          >
            Pin inside
          </button>
          <button
            type="button"
            onClick={() => setPinAndFit(OUTSIDE_PIN)}
            className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-forest ring-1 ring-forest/15"
          >
            Pin outside
          </button>
        </div>

        <div className="relative h-80 overflow-hidden rounded-[1.5rem] bg-[#dce8dc] ring-1 ring-forest/10">
          {!apiKey ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <MapPin className="h-10 w-10 text-leaf" aria-hidden />
              <p className="mt-2 text-[13px] font-semibold text-forest">
                Map API not configured
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for this demo.
              </p>
            </div>
          ) : null}

          {apiKey && (!isLoaded || loadError) ? (
            <div className="flex h-full items-center justify-center px-4 text-[13px] text-muted">
              {loadError ? "Could not load Google Maps." : "Loading map…"}
            </div>
          ) : null}

          {apiKey && isLoaded && !loadError ? (
            <GoogleMap
              onLoad={onMapLoad}
              onClick={onMapClick}
              mapContainerStyle={MAP_STYLE}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false,
              }}
            >
              <Circle
                center={SAMPLE_HUB}
                radius={SAMPLE_RADIUS_M}
                options={circleOptions}
              />
              <Polyline path={ringPath} options={ringOptions} />
              <Marker
                position={SAMPLE_HUB}
                title="Shop"
                label={{
                  text: "S",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "13px",
                }}
              />
              {hasCustomerPin && pin ? (
                <Marker
                  position={pin}
                  draggable
                  onDragEnd={onDragEnd}
                  title="Your pin"
                />
              ) : null}
            </GoogleMap>
          ) : null}

          {!hasCustomerPin ? (
            <div
              className="pointer-events-none absolute top-3 left-1/2 z-[2] w-[min(92%,20rem)] -translate-x-1/2 rounded-2xl bg-ink px-3.5 py-2.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              role="status"
            >
              <p className="flex items-center justify-center gap-1.5 text-[13px] font-extrabold tracking-tight text-white">
                <Navigation className="h-3.5 w-3.5 shrink-0 text-track" aria-hidden />
                Pin your spot to check delivery
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-white/75">
                Detect, search, or tap the map — shop marked with S
              </p>
            </div>
          ) : inside ? (
            <div
              className="pointer-events-none absolute top-3 left-1/2 z-[2] w-[min(92%,20rem)] -translate-x-1/2 rounded-2xl bg-ink px-3.5 py-2.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              role="status"
            >
              <p className="text-[13px] font-extrabold tracking-tight text-white">
                We deliver here
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-track">
                {distanceM} m from shop
              </p>
            </div>
          ) : (
            <div
              className="pointer-events-none absolute top-3 left-1/2 z-[2] w-[min(92%,20rem)] -translate-x-1/2 rounded-2xl bg-[#8b1e1e] px-3.5 py-2.5 text-center shadow-[0_8px_24px_rgba(139,30,30,0.35)]"
              role="status"
            >
              <p className="text-[13px] font-extrabold tracking-tight text-white">
                Outside delivery area
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-red-100/90">
                {distanceM} m away · max {SAMPLE_RADIUS_M} m
              </p>
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
