'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import {
  Aiming2Regular as Crosshair,
  CloseRegular as X,
  Loading2Regular as Loader2,
  MapPinRegular as MapPin,
  SearchRegular as Search,
} from './icons';
import { getDefaultMapCenter } from '../utils/geocoding';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
const GOOGLE_LIBRARIES = ['places', 'marker'];
const PIN_BASE_W = 40;
const PIN_BASE_H = 54;
const HOME_BASE = 28;
const STORE_BASE = 28;
const REFERENCE_ZOOM = 14;

function scaleForZoom(zoom) {
  const step = 0.1;
  const factor = 1 + ((zoom ?? REFERENCE_ZOOM) - REFERENCE_ZOOM) * step;
  return Math.max(0.6, Math.min(1.7, factor));
}

function clampLat(v) { return Math.max(-85, Math.min(85, v)); }
function clampLng(v) { return ((v + 540) % 360) - 180; }

function parseGoogleAddress(result) {
  if (!result) return null;
  const comps = Array.isArray(result.address_components) ? result.address_components : [];
  const byType = (types) => comps.find((c) => types.every((t) => c.types?.includes(t)));
  const long = (types) => byType(types)?.long_name || '';

  const house = long(['street_number']);
  const route = long(['route']);
  const landmark = long(['point_of_interest']) || long(['establishment']) || '';
  const locality =
    long(['locality', 'political']) ||
    long(['sublocality_level_1', 'sublocality', 'political']) ||
    long(['administrative_area_level_2', 'political']) ||
    '';
  const state = long(['administrative_area_level_1', 'political']);
  const postalCode = long(['postal_code']);
  const country = long(['country', 'political']);

  const line1 = [house, route].filter(Boolean).join(' ').trim();
  const line2 = long(['sublocality_level_1', 'sublocality', 'political']) || '';

  return {
    line1,
    line2,
    landmark,
    city: locality,
    state,
    postalCode,
    country,
    displayName: result.formatted_address || '',
    raw: result,
  };
}

export default function AddressMapPicker({
  value,
  onChange,
  onAddress,
  height = 240,
  showSearch = true,
  variant = 'card',
  centerPinMode = false,
  userLocation = null,
  storeLocation = null,
  /** When false, the shop pin is hidden (delivery circle can still use `storeLocation` as centre). */
  showStoreMarker = true,
  /** Delivery radius in metres, centred on `storeLocation` (e.g. API `maxRadiusM`). */
  deliveryRadiusM = null,
  /** When true with `centerPinMode`, fit the map to the delivery circle once on load. */
  fitDeliveryZone = false,
  focusRequest = null,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'yaadro-google-map',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  const isFullscreen = variant === 'fullscreen';
  const fallback = useMemo(() => getDefaultMapCenter(), []);
  const initialPoint =
    value && Number.isFinite(value.lat) && Number.isFinite(value.lng)
      ? { lat: value.lat, lng: value.lng }
      : fallback;

  const [point, setPoint] = useState(initialPoint);
  const [liveZoom, setLiveZoom] = useState(value?.lat ? 16 : 12);
  const [reverseStatus, setReverseStatus] = useState('idle'); // idle | loading | error
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const mapRef = useRef(null);
  /** Set when `GoogleMap` fires `onLoad` so delivery circle attaches after the map exists. */
  const [mapInstance, setMapInstance] = useState(null);
  const deliveryCircleRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesServiceRef = useRef(null);
  const markerLibRef = useRef(null);
  const dragListenerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const centerDebounceRef = useRef(null);
  const lastCenterEmitKeyRef = useRef('');
  const lastReverseResolvedKeyRef = useRef('');
  const reverseReqIdRef = useRef(0);
  const deliveryZoneFittedRef = useRef('');

  const iconScale = useMemo(() => scaleForZoom(liveZoom), [liveZoom]);
  const pinW = Math.round(PIN_BASE_W * iconScale);
  const pinH = Math.round(PIN_BASE_H * iconScale);
  const userIconSize = Math.round(HOME_BASE * iconScale);
  const storeIconSize = Math.round(STORE_BASE * iconScale);

  const buildMarkerContent = useCallback((url, width, height) => {
    if (typeof document === 'undefined') return null;
    const img = document.createElement('img');
    img.src = url;
    img.width = width;
    img.height = height;
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.alt = '';
    return img;
  }, []);

  const clearMarker = (markerRef) => {
    if (!markerRef?.current) return;
    markerRef.current.map = null;
    markerRef.current = null;
  };

  useEffect(() => {
    if (!value) return;
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;
    if (value.lat === point.lat && value.lng === point.lng) return;
    setPoint({ lat: value.lat, lng: value.lng });
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenterMap = useCallback((lat, lng, targetZoom) => {
    const inst = mapRef.current;
    if (!inst) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const z = Number.isFinite(targetZoom) ? targetZoom : inst.getZoom?.() || liveZoom;
    inst.panTo({ lat, lng });
    if (Number.isFinite(z)) {
      inst.setZoom(z);
      setLiveZoom(z);
    }
  }, [liveZoom]);

  // Parent can request an imperative recenter (e.g. "focus store"/"focus me" buttons).
  useEffect(() => {
    if (!focusRequest) return;
    const lat = Number(focusRequest?.lat);
    const lng = Number(focusRequest?.lng);
    const zoomTo = Number(focusRequest?.zoom);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    recenterMap(lat, lng, Number.isFinite(zoomTo) ? zoomTo : undefined);
  }, [focusRequest, recenterMap]);

  const reverseGeocodeWithGoogle = useCallback((lat, lng) => {
    if (!geocoderRef.current || !window?.google?.maps) return;
    // Avoid repeated reverse-geocoding for practically identical coordinates.
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastReverseResolvedKeyRef.current === key) return;

    const reqId = ++reverseReqIdRef.current;
    setReverseStatus('loading');
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      // Ignore stale callbacks if a newer reverse-geocode was requested.
      if (reqId !== reverseReqIdRef.current) return;
      if (status === 'OK' && Array.isArray(results) && results.length > 0) {
        const parsed = parseGoogleAddress(results[0]);
        if (parsed) onAddress?.(parsed);
        lastReverseResolvedKeyRef.current = key;
        setReverseStatus('idle');
      } else {
        setReverseStatus('error');
      }
    });
  }, [onAddress]);

  const updatePoint = useCallback((lat, lng, { skipReverse } = {}) => {
    const next = { lat, lng };
    setPoint(next);
    onChange?.(next);
    if (skipReverse || !onAddress) return;
    reverseGeocodeWithGoogle(lat, lng);
  }, [onChange, onAddress, reverseGeocodeWithGoogle]);

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          recenterMap(lat, lng, 17);
          updatePoint(lat, lng);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  };

  useEffect(() => {
    if (!showSearch || !isLoaded || !window?.google?.maps || !placesServiceRef.current) return undefined;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return undefined;
    }
    setSearching(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      placesServiceRef.current.getPlacePredictions(
        { input: q, componentRestrictions: { country: 'in' } },
        (predictions, status) => {
          setSearching(false);
          if (status !== 'OK' || !Array.isArray(predictions)) {
            setSearchResults([]);
            return;
          }
          const mapped = predictions.slice(0, 6).map((p) => ({
            placeId: p.place_id,
            displayName: p.description,
          }));
          setSearchResults(mapped);
          setSearchOpen(true);
        }
      );
    }, 320);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, showSearch, isLoaded]);

  const handleSelectSearchResult = useCallback((item) => {
    if (!geocoderRef.current || !item?.placeId) return;
    geocoderRef.current.geocode({ placeId: item.placeId }, (results, status) => {
      if (status !== 'OK' || !Array.isArray(results) || results.length === 0) return;
      const r = results[0];
      const loc = r.geometry?.location;
      if (!loc) return;
      const lat = loc.lat();
      const lng = loc.lng();
      setSearchOpen(false);
      setSearchQuery(r.formatted_address || item.displayName);
      recenterMap(lat, lng, 17);
      updatePoint(lat, lng);
    });
  }, [recenterMap, updatePoint]);

  const onMapLoad = useCallback(async (map) => {
    mapRef.current = map;
    setMapInstance(map);
    if (window?.google?.maps) {
      geocoderRef.current = new window.google.maps.Geocoder();
      placesServiceRef.current = new window.google.maps.places.AutocompleteService();
      try {
        markerLibRef.current = await window.google.maps.importLibrary('marker');
      } catch {
        markerLibRef.current = null;
      }
    }
  }, []);

  useEffect(() => () => setMapInstance(null), []);

  // Service radius from shop (circle) — helps users align the pin with deliverable area.
  useEffect(() => {
    if (!mapInstance || !isLoaded || typeof window === 'undefined' || !window.google?.maps) {
      return undefined;
    }
    const lat = Number(storeLocation?.lat);
    const lng = Number(storeLocation?.lng);
    const r = Number(deliveryRadiusM);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(r) || r <= 0) {
      if (deliveryCircleRef.current) {
        deliveryCircleRef.current.setMap(null);
        deliveryCircleRef.current = null;
      }
      return undefined;
    }
    if (deliveryCircleRef.current) {
      deliveryCircleRef.current.setMap(null);
      deliveryCircleRef.current = null;
    }
    deliveryCircleRef.current = new window.google.maps.Circle({
      map: mapInstance,
      center: { lat, lng },
      radius: r,
      strokeColor: '#7d24d6',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: '#34d399',
      fillOpacity: 0.14,
      clickable: false,
      zIndex: 0,
    });
    return () => {
      if (deliveryCircleRef.current) {
        deliveryCircleRef.current.setMap(null);
        deliveryCircleRef.current = null;
      }
    };
  }, [mapInstance, isLoaded, storeLocation?.lat, storeLocation?.lng, deliveryRadiusM]);

  // Fit map to the delivery circle so the shop hub + radius are visible (e.g. bottom sheet).
  useEffect(() => {
    if (
      !fitDeliveryZone ||
      !centerPinMode ||
      !mapInstance ||
      !isLoaded ||
      typeof window === 'undefined' ||
      !window.google?.maps
    ) {
      return undefined;
    }
    const lat = Number(storeLocation?.lat);
    const lng = Number(storeLocation?.lng);
    const r = Number(deliveryRadiusM);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(r) || r <= 0) {
      return undefined;
    }

    const fitKey = `${lat.toFixed(5)},${lng.toFixed(5)},${Math.round(r)}`;
    if (deliveryZoneFittedRef.current === fitKey) return undefined;

    const latDelta = r / 111_320;
    const lngDelta = r / (111_320 * Math.cos((lat * Math.PI) / 180));
    const bounds = new window.google.maps.LatLngBounds(
      { lat: lat - latDelta, lng: lng - lngDelta },
      { lat: lat + latDelta, lng: lng + lngDelta }
    );
    mapInstance.fitBounds(bounds, { top: 56, bottom: 56, left: 32, right: 32 });
    deliveryZoneFittedRef.current = fitKey;

    return undefined;
  }, [
    fitDeliveryZone,
    centerPinMode,
    mapInstance,
    isLoaded,
    storeLocation?.lat,
    storeLocation?.lng,
    deliveryRadiusM,
  ]);

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const z = map.getZoom?.();
    if (Number.isFinite(z)) setLiveZoom(z);
    if (!centerPinMode) return;
    const c = map.getCenter?.();
    if (!c) return;
    if (centerDebounceRef.current) clearTimeout(centerDebounceRef.current);
    centerDebounceRef.current = setTimeout(() => {
      const lat = clampLat(c.lat());
      const lng = clampLng(c.lng());
      // Deduplicate idle emissions from the same center position.
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (lastCenterEmitKeyRef.current === key) return;
      lastCenterEmitKeyRef.current = key;
      updatePoint(lat, lng);
    }, 360);
  }, [centerPinMode, updatePoint]);

  useEffect(() => {
    const map = mapRef.current;
    const AdvancedMarkerElement = markerLibRef.current?.AdvancedMarkerElement;
    if (!isLoaded || !map || !AdvancedMarkerElement) return undefined;

    if (dragListenerRef.current) {
      dragListenerRef.current.remove();
      dragListenerRef.current = null;
    }
    clearMarker(userMarkerRef);
    clearMarker(storeMarkerRef);
    clearMarker(pinMarkerRef);

    if (userLocation?.lat != null && userLocation?.lng != null) {
      userMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat: userLocation.lat, lng: userLocation.lng },
        content: buildMarkerContent('/home-icon.png', userIconSize, userIconSize),
        gmpClickable: false,
        zIndex: 10,
      });
    }

    if (
      showStoreMarker &&
      storeLocation?.lat != null &&
      storeLocation?.lng != null
    ) {
      storeMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat: storeLocation.lat, lng: storeLocation.lng },
        content: buildMarkerContent('/store-icon.png', storeIconSize, storeIconSize),
        gmpClickable: false,
        zIndex: 20,
      });
    }

    if (!centerPinMode) {
      pinMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat: point.lat, lng: point.lng },
        content: buildMarkerContent('/map-pin.png', pinW, pinH),
        gmpDraggable: true,
        zIndex: 100,
      });
      dragListenerRef.current = pinMarkerRef.current.addListener('dragend', (e) => {
        const lat = e?.latLng?.lat?.();
        const lng = e?.latLng?.lng?.();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        updatePoint(clampLat(lat), clampLng(lng));
      });
    }

    return () => {
      if (dragListenerRef.current) {
        dragListenerRef.current.remove();
        dragListenerRef.current = null;
      }
      clearMarker(userMarkerRef);
      clearMarker(storeMarkerRef);
      clearMarker(pinMarkerRef);
    };
  }, [
    isLoaded,
    userLocation?.lat,
    userLocation?.lng,
    storeLocation?.lat,
    storeLocation?.lng,
    showStoreMarker,
    centerPinMode,
    point.lat,
    point.lng,
    userIconSize,
    storeIconSize,
    pinW,
    pinH,
    buildMarkerContent,
    updatePoint,
  ]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-3 text-center text-xs text-amber-900">
        Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to use Google Maps address picking.
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? 'relative h-full w-full bg-white'
          : 'overflow-hidden rounded-2xl border border-gray-200 bg-white'
      }
    >
      {showSearch && (
        <div
          className={
            isFullscreen
              ? // Leave 56px of padding on the left so a floating back button
                // (h-11 + 12px gap) can sit beside the search bar without overlap.
                'absolute right-3 top-3 z-[1000] left-[56px]'
              : 'relative border-b border-gray-100 bg-white p-2'
          }
          style={isFullscreen ? { marginTop: 'env(safe-area-inset-top)' } : undefined}
        >
          <div
            className={
              isFullscreen
                ? 'flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 shadow-md backdrop-blur'
                : 'flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2'
            }
          >
            <Search size={16} className="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              placeholder="Search area, landmark or pincode"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              autoComplete="off"
            />
            {searching ? (
              <Loader2 size={16} className="h-4 w-4 flex-shrink-0 animate-spin text-gray-500" aria-hidden />
            ) : searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200"
              >
                <X size={14} className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {searchOpen && searchResults.length > 0 && (
            <div
              className={
                isFullscreen
                  ? 'absolute inset-x-0 top-full z-[1100] mt-1 max-h-56 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl'
                  : 'absolute inset-x-2 top-full z-[1100] mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg'
              }
              role="listbox"
            >
              {searchResults.map((r, i) => (
                <button
                  type="button"
                  key={`${r.placeId}-${i}`}
                  onClick={() => handleSelectSearchResult(r)}
                  className="flex w-full items-start gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                >
                  <MapPin size={16} className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" aria-hidden />
                  <span className="text-[12px] leading-snug text-gray-800 line-clamp-2">
                    {r.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={isFullscreen ? 'absolute inset-0' : 'relative'}
        style={isFullscreen ? undefined : { height }}
      >
        {(!isLoaded || loadError) && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gray-50 text-[12px] text-gray-500">
            {loadError ? 'Could not load Google Maps.' : (
              <>
                <Loader2 size={16} className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Loading map…
              </>
            )}
          </div>
        )}
        {isLoaded && !loadError && (
          <GoogleMap
            onLoad={onMapLoad}
            onIdle={handleIdle}
            center={point}
            zoom={liveZoom}
            options={{
              disableDefaultUI: false,
              zoomControl: !isFullscreen,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              mapId: GOOGLE_MAPS_MAP_ID,
            }}
            mapContainerClassName="h-full w-full"
            onClick={(e) => {
              if (centerPinMode) return;
              const lat = e.latLng?.lat?.();
              const lng = e.latLng?.lng?.();
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
              updatePoint(clampLat(lat), clampLng(lng));
            }}
          >
          </GoogleMap>
        )}

        {isLoaded && centerPinMode && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[650] -translate-x-1/2 -translate-y-full"
            aria-hidden
          >
            <img
              src="/map-pin.png"
              alt=""
              width={pinW}
              height={pinH}
              className="address-map-pin select-none"
              style={{
                width: pinW,
                height: pinH,
                objectFit: 'contain',
                display: 'block',
                transition: 'width 200ms ease-out, height 200ms ease-out',
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          aria-label="Use my current location"
          className={
            isFullscreen
              ? 'absolute right-3 top-20 z-[1000] inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md hover:bg-gray-50 disabled:opacity-60'
              : 'absolute bottom-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-800 shadow-md hover:bg-gray-50 disabled:opacity-60'
          }
        >
          {locating ? (
            <Loader2 size={16} className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Crosshair size={16} className="h-4 w-4" aria-hidden />
          )}
          {!isFullscreen && (
            <span>{locating ? 'Locating…' : 'My location'}</span>
          )}
        </button>

        {reverseStatus === 'loading' && (
          <div
            className={
              isFullscreen
                ? 'absolute left-1/2 top-20 z-[1000] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-md'
                : 'absolute left-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow'
            }
          >
            <Loader2 size={12} className="h-3 w-3 animate-spin" aria-hidden />
            Resolving address…
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-gray-500">
          <span className="truncate">
            {centerPinMode
              ? 'Pan and zoom the map to place the pin on your spot.'
              : 'Tap or drag the pin to fine-tune your delivery point.'}
          </span>
          <span className="flex-shrink-0 font-mono text-[10px] text-gray-400">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
