'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Loading2Regular as Loader2 } from '../icons';
import { useLocationService } from '../../context/LocationServiceContext';
import { useShopBranding } from '../../context/ShopBrandingContext';
import { getStoreCoordinates } from '../../utils/storeLocation';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
/** Same loader id as AddressMapPicker — one Maps script for the app. */
const GOOGLE_LIBRARIES = ['places', 'marker'];
const MAP_HEIGHT_PX = 220;
const FIT_PADDING = { top: 52, right: 44, bottom: 52, left: 44 };
/** Real shop asset. `/home-icon.png` is also a storefront — do NOT use it for the user. */
const SHOP_ICON_URL = '/store-icon.png';
const SHOP_ICON_W = 44;
const SHOP_ICON_H = 42;
const USER_ICON_W = 40;
const USER_ICON_H = 48;
const MAX_ZOOM = 15;
const MIN_ZOOM = 11;

/**
 * Proper person/user map pin (blue). Built as SVG so we never reuse the shop art.
 */
function buildUserPinIconUrl() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
  <defs>
    <filter id="u" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path filter="url(#u)" fill="#2563eb" stroke="#ffffff" stroke-width="2"
    d="M20 1.5c-9.1 0-16.5 7.4-16.5 16.5 0 12.4 14.2 27.2 15.5 28.5.5.5 1.4.5 1.9 0C22.3 45.2 36.5 30.4 36.5 18 36.5 8.9 29.1 1.5 20 1.5z"/>
  <circle cx="20" cy="15" r="5.2" fill="#ffffff"/>
  <path fill="#ffffff" d="M11.5 28.2c0-4.1 3.8-6.7 8.5-6.7s8.5 2.6 8.5 6.7v.6c0 .7-.6 1.2-1.3 1.2H12.8c-.7 0-1.3-.5-1.3-1.2v-.6z"/>
</svg>`.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const USER_PIN_URL = buildUserPinIconUrl();

const CLEAN_MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

function finitePoint(p) {
  if (!p) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function readCachedShopLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('yaadro-delivery-check-v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return finitePoint(parsed?.shopLocation) || finitePoint(parsed?.shop_location);
  } catch {
    return null;
  }
}

function clearOverlay(ref) {
  if (!ref?.current) return;
  const m = ref.current;
  if (typeof m.setMap === 'function') m.setMap(null);
  else if ('map' in m) m.map = null;
  ref.current = null;
}

/**
 * Profile map: user pin + shop icon + visible connecting line, fitted in view.
 * Informational only — no directions / deep-links / business-logic changes.
 */
export default function ProfileDeliveryShopCard() {
  const { coords, shopLocation, placeLabel, phase, isChecking } = useLocationService();
  const { shopName } = useShopBranding();
  const brand = (shopName || 'Yaadro').trim() || 'Yaadro';

  const userLat = coords?.lat;
  const userLng = coords?.lng;
  const shopLat = shopLocation?.lat;
  const shopLng = shopLocation?.lng;

  const userPoint = useMemo(
    () => finitePoint({ lat: userLat, lng: userLng }),
    [userLat, userLng]
  );
  const shopPoint = useMemo(() => {
    return (
      finitePoint({ lat: shopLat, lng: shopLng }) ||
      readCachedShopLocation() ||
      finitePoint(getStoreCoordinates())
    );
  }, [shopLat, shopLng]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'yaadro-google-map',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const userMarkerRef = useRef(null);
  const shopMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const fitListenerRef = useRef(null);

  const centerFallback = useMemo(() => {
    if (userPoint) return userPoint;
    if (shopPoint) return shopPoint;
    return getStoreCoordinates();
  }, [userPoint, shopPoint]);

  const fitBothInView = useCallback(
    (map) => {
      if (!map || typeof window === 'undefined' || !window.google?.maps) return;
      const gmaps = window.google.maps;
      const points = [userPoint, shopPoint].filter(Boolean);
      if (points.length === 0) return;

      if (fitListenerRef.current) {
        gmaps.event.removeListener(fitListenerRef.current);
        fitListenerRef.current = null;
      }

      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(14);
        return;
      }

      const bounds = new gmaps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latSpan = Math.abs(ne.lat() - sw.lat());
      const lngSpan = Math.abs(ne.lng() - sw.lng());
      if (latSpan < 1e-5 && lngSpan < 1e-5) {
        map.setCenter(points[0]);
        map.setZoom(14);
        return;
      }

      map.fitBounds(bounds, FIT_PADDING);

      fitListenerRef.current = gmaps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom?.();
        if (!Number.isFinite(z)) return;
        if (z > MAX_ZOOM) map.setZoom(MAX_ZOOM);
        else if (z < MIN_ZOOM) map.setZoom(MIN_ZOOM);
      });
    },
    [userPoint, shopPoint]
  );

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      setMapReady(true);
      fitBothInView(map);
    },
    [fitBothInView]
  );

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    fitBothInView(mapRef.current);
  }, [mapReady, fitBothInView, userPoint?.lat, userPoint?.lng, shopPoint?.lat, shopPoint?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !isLoaded || typeof window === 'undefined' || !window.google?.maps) {
      return undefined;
    }

    const gmaps = window.google.maps;

    clearOverlay(userMarkerRef);
    clearOverlay(shopMarkerRef);
    clearOverlay(lineRef);

    // Draw line first (under markers), with LatLng objects so Google always paints it.
    if (userPoint && shopPoint) {
      const from = new gmaps.LatLng(userPoint.lat, userPoint.lng);
      const to = new gmaps.LatLng(shopPoint.lat, shopPoint.lng);
      lineRef.current = new gmaps.Polyline({
        map,
        path: [from, to],
        geodesic: true,
        strokeColor: '#7c3aed',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        clickable: false,
        zIndex: 1,
      });
    }

    if (userPoint) {
      userMarkerRef.current = new gmaps.Marker({
        map,
        position: userPoint,
        icon: {
          url: USER_PIN_URL,
          scaledSize: new gmaps.Size(USER_ICON_W, USER_ICON_H),
          anchor: new gmaps.Point(USER_ICON_W / 2, USER_ICON_H),
          labelOrigin: new gmaps.Point(USER_ICON_W / 2, USER_ICON_H + 12),
        },
        label: {
          text: 'You',
          color: '#1d4ed8',
          fontSize: '12px',
          fontWeight: '700',
        },
        clickable: false,
        optimized: false,
        zIndex: 40,
        title: 'You are here',
      });
    }

    if (shopPoint) {
      shopMarkerRef.current = new gmaps.Marker({
        map,
        position: shopPoint,
        icon: {
          url: SHOP_ICON_URL,
          scaledSize: new gmaps.Size(SHOP_ICON_W, SHOP_ICON_H),
          anchor: new gmaps.Point(SHOP_ICON_W / 2, SHOP_ICON_H),
          labelOrigin: new gmaps.Point(SHOP_ICON_W / 2, SHOP_ICON_H + 12),
        },
        label: {
          text: 'Shop',
          color: '#6d28d9',
          fontSize: '12px',
          fontWeight: '700',
        },
        clickable: false,
        optimized: false,
        zIndex: 50,
        title: `Shop: ${brand}`,
      });
    }

    return () => {
      clearOverlay(userMarkerRef);
      clearOverlay(shopMarkerRef);
      clearOverlay(lineRef);
      if (fitListenerRef.current && window.google?.maps) {
        window.google.maps.event.removeListener(fitListenerRef.current);
        fitListenerRef.current = null;
      }
    };
  }, [mapReady, isLoaded, userPoint, shopPoint, brand]);

  const locationLoading = isChecking || phase === 'locating' || phase === 'fetching';
  const canShowMap = Boolean(GOOGLE_MAPS_KEY) && Boolean(userPoint || shopPoint);
  const bothReady = Boolean(userPoint && shopPoint);

  return (
    <section
      className="mx-4 mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-slide-up motion-reduce:animate-none"
      aria-label="Your delivery shop"
    >
      <div className="border-b border-gray-50 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          Your delivery shop
        </p>
        <h3 className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">
          Products are coming from {brand}
        </h3>
        {bothReady ? (
          <p className="mt-1 text-[12px] leading-snug text-gray-500">
            Purple line connects you to the shop
          </p>
        ) : null}
      </div>

      <div className="px-3 pb-3 pt-2.5">
        {!GOOGLE_MAPS_KEY ? (
          <div className="flex h-[120px] items-center justify-center rounded-xl bg-gray-50 px-3 text-center text-[13px] text-gray-500">
            Map unavailable. Products are coming from {brand}.
          </div>
        ) : locationLoading && !userPoint && !shopPoint ? (
          <div className="flex h-[120px] items-center justify-center gap-2 rounded-xl bg-gray-50 text-[13px] text-gray-500">
            <Loader2 size={16} className="h-4 w-4 animate-spin" aria-hidden />
            Finding your delivery location…
          </div>
        ) : canShowMap ? (
          <>
            <div
              className="relative w-full overflow-hidden rounded-xl ring-1 ring-gray-100"
              style={{ height: MAP_HEIGHT_PX }}
            >
              {(!isLoaded || loadError) && (
                <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gray-50 text-[12px] text-gray-500">
                  {loadError ? (
                    'Could not load Google Maps.'
                  ) : (
                    <>
                      <Loader2 size={16} className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Loading map…
                    </>
                  )}
                </div>
              )}

              {isLoaded && !loadError ? (
                <GoogleMap
                  onLoad={onMapLoad}
                  onUnmount={() => {
                    mapRef.current = null;
                    setMapReady(false);
                  }}
                  center={centerFallback}
                  zoom={14}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    styles: CLEAN_MAP_STYLES,
                    gestureHandling: 'none',
                    keyboardShortcuts: false,
                    draggable: false,
                    scrollwheel: false,
                    disableDoubleClickZoom: true,
                    maxZoom: MAX_ZOOM,
                    minZoom: MIN_ZOOM,
                  }}
                  mapContainerClassName="h-full w-full"
                />
              ) : null}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-2.5 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={USER_PIN_URL}
                  alt=""
                  width={28}
                  height={34}
                  className="mt-0.5 h-8 w-7 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    You
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-gray-800">
                    {placeLabel || 'Your delivery location'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-violet-50 px-2.5 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SHOP_ICON_URL}
                  alt=""
                  width={28}
                  height={26}
                  className="mt-0.5 h-7 w-7 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                    Shop
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-gray-800">
                    {brand}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[13px] text-gray-600">
            Products are coming from {brand}.
            <p className="mt-1 text-xs text-gray-500">
              Set a delivery location to see you and the shop on the map.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
