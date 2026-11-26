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
import { getShopDeliveryHub } from "@/lib/api/shop-delivery-hub";
import { cn } from "@/lib/cn";
import { haversineMeters } from "@/lib/db/haversine";
import {
  boundsForDeliveryRadius,
  circleRingPath,
  dashedRingOptions,
  DELIVERY_RADIUS_MAP_STYLE,
  type MapLatLng,
  type ShopDeliveryHub,
} from "@/lib/delivery-radius-map";
import {
  DEFAULT_MAP_CENTER,
  getGoogleMapsApiKey,
  GOOGLE_MAPS_JS_LOADER,
} from "@/lib/live-track-map";
import {
  reverseGeocodeLatLng,
  type DetectedPlace,
} from "@/lib/saved-addresses";

const MAP_CONTAINER = { width: "100%", height: "100%" } as const;

type LatLng = MapLatLng;

function clampLat(v: number) {
  return Math.max(-85, Math.min(85, v));
}

function clampLng(v: number) {
  return ((v + 540) % 360) - 180;
}

function placePoint(place: DetectedPlace | null): LatLng | null {
  if (
    typeof place?.lat === "number" &&
    typeof place?.lng === "number" &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  ) {
    return { lat: place.lat, lng: place.lng };
  }
  return null;
}

/**
 * Interactive Google Map for the address sheet.
 * Shop hub pin + dotted delivery radius when hub data is available.
 * Delivery status only after detect / search / map tap (not the default center).
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
    id: GOOGLE_MAPS_JS_LOADER.id,
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_JS_LOADER.libraries,
  });

  const fromPlace = placePoint(place);
  const placeKey = fromPlace
    ? `${fromPlace.lat.toFixed(5)},${fromPlace.lng.toFixed(5)}`
    : "";

  const [point, setPoint] = useState<LatLng>(
    () => fromPlace ?? { ...DEFAULT_MAP_CENTER },
  );
  const [syncedKey, setSyncedKey] = useState(placeKey);
  const [hub, setHub] = useState<ShopDeliveryHub | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastResolvedKey = useRef("");

  // Adjust marker when the parent place changes (React-recommended render sync).
  if (placeKey && placeKey !== syncedKey && fromPlace) {
    setSyncedKey(placeKey);
    setPoint(fromPlace);
  }

  useEffect(() => {
    let cancelled = false;
    void getShopDeliveryHub()
      .then((next) => {
        if (!cancelled) setHub(next);
      })
      .catch(() => {
        if (!cancelled) setHub(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only score delivery after a real pin (detect / search / map tap) — not the
  // default map center, which falsely looked "outside" and confused shoppers.
  const hasRealPin = Boolean(fromPlace);
  const distanceM = useMemo(() => {
    if (!hub || !fromPlace) return null;
    return Math.round(
      haversineMeters(fromPlace.lat, fromPlace.lng, hub.lat, hub.lng),
    );
  }, [hub, fromPlace]);
  const inside =
    hub != null && distanceM != null ? distanceM <= hub.radiusM : null;

  const fitMap = useCallback(
    (pin: LatLng | null, nextHub: ShopDeliveryHub | null = hub) => {
      const map = mapRef.current;
      if (!map || !nextHub || typeof google === "undefined") return;
      map.fitBounds(
        boundsForDeliveryRadius(nextHub, nextHub.radiusM, pin),
        { top: 56, right: 40, bottom: 40, left: 40 },
      );
    },
    [hub],
  );

  useEffect(() => {
    if (!fromPlace || !placeKey) return;
    lastResolvedKey.current = placeKey;
    if (hub) {
      fitMap(fromPlace, hub);
    } else {
      mapRef.current?.panTo(fromPlace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- placeKey encodes lat/lng
  }, [placeKey, hub, fitMap]);

  useEffect(() => {
    if (!hub || fromPlace) return;
    // Wide view of the radius only — no fake pin in the bounds.
    fitMap(null, hub);
  }, [hub, fromPlace, fitMap]);

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

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (hub) {
        fitMap(fromPlace, hub);
      }
    },
    [fitMap, hub, fromPlace],
  );

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const next = { lat: clampLat(lat), lng: clampLng(lng) };
      setPoint(next);
      if (hub) fitMap(next, hub);
      void resolvePoint(next.lat, next.lng, "Pin set — confirm to continue.");
    },
    [fitMap, hub, resolvePoint],
  );

  const ringPath = useMemo(
    () => (hub ? circleRingPath(hub, hub.radiusM) : []),
    [hub],
  );

  const style =
    inside === false
      ? DELIVERY_RADIUS_MAP_STYLE.outside
      : DELIVERY_RADIUS_MAP_STYLE.inside; // soft green until a real pin is outside

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

  const ringOptions = useMemo(
    () => dashedRingOptions(style.stroke),
    [style.stroke],
  );

  if (!apiKey) {
    return (
      <div
        className={cn(
          "relative flex h-64 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[#dce8dc] px-4 text-center ring-1 ring-forest/10",
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
        "relative h-64 overflow-hidden rounded-[1.5rem] bg-[#dce8dc] ring-1 ring-forest/10",
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
          center={hub ?? point}
          zoom={hub ? undefined : place?.lat != null ? 16 : 12}
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
          {hub ? (
            <>
              <Circle
                center={hub}
                radius={hub.radiusM}
                options={circleOptions}
              />
              <Polyline path={ringPath} options={ringOptions} />
              <Marker
                position={hub}
                title="Shop"
                label={{
                  text: "S",
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: "13px",
                }}
              />
            </>
          ) : null}
          {hasRealPin ? (
            <Marker
              position={point}
              draggable
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (typeof lat !== "number" || typeof lng !== "number") return;
                const next = { lat: clampLat(lat), lng: clampLng(lng) };
                setPoint(next);
                if (hub) fitMap(next, hub);
                void resolvePoint(
                  next.lat,
                  next.lng,
                  "Pin set — confirm to continue.",
                );
              }}
            />
          ) : null}
        </GoogleMap>
      ) : null}

      {(resolving || !isLoaded) && !loadError ? (
        <div className="pointer-events-none absolute top-3 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-forest shadow ring-1 ring-forest/10">
          {resolving ? "Resolving address…" : "Loading map…"}
        </div>
      ) : hub && hasRealPin && inside != null && distanceM != null ? (
        inside ? (
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
              {distanceM} m away · max {hub.radiusM} m
            </p>
          </div>
        )
      ) : hub && !hasRealPin ? (
        <div
          className="pointer-events-none absolute top-3 left-1/2 z-[2] w-[min(92%,20rem)] -translate-x-1/2 rounded-2xl bg-ink px-3.5 py-2.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
          role="status"
        >
          <p className="flex items-center justify-center gap-1.5 text-[13px] font-extrabold tracking-tight text-white">
            <Navigation
              className="h-3.5 w-3.5 shrink-0 text-track"
              aria-hidden
            />
            Pin your spot to check delivery
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-white/75">
            Detect, search, or tap the map — shop marked with S
          </p>
        </div>
      ) : null}
    </div>
  );
}
