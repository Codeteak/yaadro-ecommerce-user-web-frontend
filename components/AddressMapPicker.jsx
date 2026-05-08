'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { forwardGeocode, getDefaultMapCenter, reverseGeocode } from '../utils/geocoding';

// ─────────────────────────────────────────────
// One-time defensive patches for two paired Leaflet errors that fire under
// React 18 strict-mode and Next.js Fast Refresh:
//
//   1) "Map container is already initialized."
//      Leaflet stamps `_leaflet_id` onto a DOM node when it initialises a map
//      there and refuses to initialise again on the same node. HMR can leave
//      a stale id behind on a recycled DOM node.
//
//   2) "Map container is being reused by another instance."
//      `Map.remove()` validates that the container still belongs to *this*
//      map. After (1) is healed by clearing the stale id, the old map's
//      cleanup tries to run and fails this check.
//
// We patch both endpoints so the lifecycle stays self-healing without
// touching application code. The flag ensures the patch is applied exactly
// once even with HMR re-imports.
// ─────────────────────────────────────────────
if (typeof window !== 'undefined' && !L.Map.prototype.__yaadroInitPatched) {
  const originalInit = L.Map.prototype._initContainer;
  L.Map.prototype._initContainer = function patchedInitContainer(id) {
    const node = typeof id === 'string' ? document.getElementById(id) : id;
    if (node && node._leaflet_id) {
      try { delete node._leaflet_id; } catch { /* noop */ }
    }
    return originalInit.call(this, id);
  };

  const originalRemove = L.Map.prototype.remove;
  L.Map.prototype.remove = function patchedRemove() {
    try {
      return originalRemove.call(this);
    } catch (err) {
      // Container was re-claimed by a newer Map instance (HMR / strict-mode
      // double-mount). The old map has nothing valid to detach from, so just
      // bail quietly instead of bubbling up a runtime error.
      if (String(err?.message || '').toLowerCase().includes('container')) {
        return this;
      }
      throw err;
    }
  };

  L.Map.prototype.__yaadroInitPatched = true;
}

// ─────────────────────────────────────────────
// Tile layer config (overridable via env).
// ─────────────────────────────────────────────
const TILE_URL =
  process.env.NEXT_PUBLIC_OSM_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_OSM_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ─────────────────────────────────────────────
// Marker base sizes (pixels at the reference zoom defined below). Aspect ratios
// match the source PNGs so the browser never squashes them. Tweaked to be
// compact so they don't dominate the viewport.
// ─────────────────────────────────────────────
const PIN_BASE_W = 40;
const PIN_BASE_H = 54; // map-pin.png  (tall pin, ~3:4 ratio)
const HOME_BASE = 28;  // home-icon.png   (square-ish)
const STORE_BASE = 28; // store-icon.png  (square-ish)
const REFERENCE_ZOOM = 14;

/** Smooth, clamped scale factor that grows with zoom so icons feel
    "anchored to ground level" — bigger when zoomed in, smaller when far out. */
function scaleForZoom(zoom) {
  const step = 0.12;
  const factor = 1 + ((zoom ?? REFERENCE_ZOOM) - REFERENCE_ZOOM) * step;
  return Math.max(0.55, Math.min(1.75, factor));
}

/** Bucket a continuous zoom (e.g. mid-pinch 14.37) to nearest 0.5 step so we
    don't recreate Leaflet icons on every frame. */
function bucketZoom(zoom) {
  return Math.round((zoom ?? REFERENCE_ZOOM) * 2) / 2;
}

function clampLat(v) { return Math.max(-85, Math.min(85, v)); }
function clampLng(v) { return ((v + 540) % 360) - 180; }

// ─────────────────────────────────────────────
// Internal helpers (must live inside <MapContainer>).
// ─────────────────────────────────────────────

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(clampLat(e.latlng.lat), clampLng(e.latlng.lng));
    },
  });
  return null;
}

/** Reports the current map zoom level back to the parent so all icons can scale. */
function ZoomTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const emit = () => onZoomChange(map.getZoom());
    emit();
    map.on('zoom', emit);
    map.on('zoomend', emit);
    return () => {
      map.off('zoom', emit);
      map.off('zoomend', emit);
    };
  }, [map, onZoomChange]);
  return null;
}

/**
 * Fixed-centre pin mode: the marker is drawn in CSS over the map centre; the user
 * pans/zooms the map. Emits debounced lat/lng from map.getCenter().
 */
function MapCenterTracker({ onStableCenter }) {
  const map = useMap();
  const timerRef = useRef(null);
  const onStableCenterRef = useRef(onStableCenter);
  onStableCenterRef.current = onStableCenter;

  useEffect(() => {
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const c = map.getCenter();
        onStableCenterRef.current(clampLat(c.lat), clampLng(c.lng));
      }, 380);
    };

    const immediate = () => {
      const c = map.getCenter();
      onStableCenterRef.current(clampLat(c.lat), clampLng(c.lng));
    };

    map.whenReady(() => {
      immediate();
    });

    map.on('moveend', schedule);
    map.on('zoomend', schedule);

    return () => {
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map]);

  return null;
}

// ─────────────────────────────────────────────
// Main picker.
// ─────────────────────────────────────────────

/**
 * Interactive map for picking a delivery point.
 *
 * Props:
 *   value          { lat, lng } | null   — current selected point
 *   onChange       (point: { lat, lng }) => void
 *   onAddress      (resolved address from reverseGeocode) => void   (optional)
 *   height         CSS height (default 240px). Pass `'100%'` for fullscreen layouts.
 *   showSearch     boolean (default true)
 *   variant        'card' (default) | 'fullscreen' — fullscreen renders borderless,
 *   centerPinMode   boolean (default false) — pin stays fixed in the centre of the
 *                   viewport; user pans/zooms the map. Ignores tap-to-move and
 *                   draggable marker. Recommended for fullscreen address flows.
 *   userLocation    { lat, lng } | null — drops a `home-icon.png` marker at the
 *                   user's current GPS position (non-interactive).
 *   storeLocation   { lat, lng } | null — drops a `store-icon.png` marker at the
 *                   fulfilment hub position (non-interactive).
 */
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
}) {
  const isFullscreen = variant === 'fullscreen';
  const fallback = useMemo(() => getDefaultMapCenter(), []);
  const initialPoint =
    value && Number.isFinite(value.lat) && Number.isFinite(value.lng)
      ? { lat: value.lat, lng: value.lng }
      : fallback;

  const [point, setPoint] = useState(initialPoint);
  // Initial zoom only — MapContainer reads `zoom` once at mount. Subsequent
  // zoom changes come from the user (and we surface them through liveZoom).
  const [zoom] = useState(value?.lat ? 16 : 12);
  // Live zoom level used to scale all map icons so they grow on zoom-in and
  // shrink on zoom-out. Bucketed (0.5 steps) for performance.
  const [liveZoom, setLiveZoom] = useState(value?.lat ? 16 : 12);
  const [reverseStatus, setReverseStatus] = useState('idle'); // idle | loading | error
  const [locating, setLocating] = useState(false);

  const reverseAbortRef = useRef(null);

  // ── React 18 strict-mode + Fast Refresh guard ────────────────────────────
  // Leaflet stamps `_leaflet_id` onto the DOM node it initialises. When React
  // re-mounts this component (strict-mode dev cycle, Fast Refresh, or route
  // navigation back to /add/address) the stale id is still on the recycled
  // node, so Leaflet throws "Map container is already initialized."
  // The fixes:
  //   1) Defer the MapContainer's first render to a useEffect. In strict-mode
  //      dev, React mounts → unmounts → mounts the component back-to-back; by
  //      gating MapContainer behind `mapReady`, the throw-away first mount
  //      never instantiates Leaflet, eliminating the dangling instance.
  //   2) A fresh React `key` per mount cycle forces React to allocate a
  //      brand-new DOM container, so Leaflet always sees a clean node.
  //   3) On unmount we call `map.remove()` ourselves to fully tear Leaflet
  //      down, in case react-leaflet's own cleanup hasn't run yet.
  const [containerKey] = useState(
    () => `rlmap-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
  );
  const [mapReady, setMapReady] = useState(false);
  const mapInstanceRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (!cancelled) setMapReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const inst = mapInstanceRef.current;
      if (inst && typeof inst.remove === 'function') {
        try { inst.remove(); } catch { /* noop */ }
      }
      mapInstanceRef.current = null;
    };
  }, []);

  const handleZoomChange = useCallback((z) => {
    setLiveZoom((prev) => (bucketZoom(prev) === bucketZoom(z) ? prev : z));
  }, []);

  // ── Zoom-scaled sizes ──────────────────────
  const iconScale = useMemo(() => scaleForZoom(liveZoom), [liveZoom]);
  const pinW = Math.round(PIN_BASE_W * iconScale);
  const pinH = Math.round(PIN_BASE_H * iconScale);

  const userIcon = useMemo(() => {
    const s = Math.round(HOME_BASE * iconScale);
    return L.icon({
      iconUrl: '/home-icon.png',
      iconRetinaUrl: '/home-icon.png',
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      popupAnchor: [0, -s / 2],
      className: 'address-map-icon address-map-icon--home',
    });
  }, [iconScale]);

  const storeIcon = useMemo(() => {
    const s = Math.round(STORE_BASE * iconScale);
    return L.icon({
      iconUrl: '/store-icon.png',
      iconRetinaUrl: '/store-icon.png',
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      popupAnchor: [0, -s / 2],
      className: 'address-map-icon address-map-icon--store',
    });
  }, [iconScale]);

  const draggablePinIcon = useMemo(() => {
    return L.icon({
      iconUrl: '/map-pin.png',
      iconRetinaUrl: '/map-pin.png',
      iconSize: [pinW, pinH],
      iconAnchor: [pinW / 2, pinH],
      popupAnchor: [0, -pinH],
      className: 'address-map-pin',
    });
  }, [pinW, pinH]);

  // Keep internal state in sync when the parent updates value externally
  // (e.g. user typed coords or clicked a saved address).
  // Sync internal `point` if the parent updates `value` programmatically. We
  // deliberately do NOT recenter or change the zoom here — the user keeps
  // whatever pan/zoom they already have. Recentering only happens on explicit
  // intents (see `recenterMap` calls in `handleLocateMe` and search-result
  // selection).
  useEffect(() => {
    if (!value) return;
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;
    if (value.lat === point.lat && value.lng === point.lng) return;
    setPoint({ lat: value.lat, lng: value.lng });
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Imperatively pan/zoom the map to a coordinate. Only used for explicit
   *  user intents (My location button, search result selection). */
  const recenterMap = useCallback((lat, lng, targetZoom) => {
    const inst = mapInstanceRef.current;
    if (!inst || typeof inst.setView !== 'function') return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const z = Number.isFinite(targetZoom) ? targetZoom : inst.getZoom();
    try { inst.setView([lat, lng], z, { animate: true }); } catch { /* noop */ }
  }, []);

  const updatePoint = async (lat, lng, { skipReverse } = {}) => {
    const next = { lat, lng };
    setPoint(next);
    onChange?.(next);
    if (skipReverse || !onAddress) return;

    if (reverseAbortRef.current) {
      try { reverseAbortRef.current.abort(); } catch { /* noop */ }
    }
    const ctrl = new AbortController();
    reverseAbortRef.current = ctrl;

    setReverseStatus('loading');
    try {
      const resolved = await reverseGeocode(lat, lng, { signal: ctrl.signal });
      if (resolved) {
        onAddress(resolved);
        setReverseStatus('idle');
      } else {
        setReverseStatus('error');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setReverseStatus('error');
    }
  };

  const updatePointRef = useRef(updatePoint);
  updatePointRef.current = updatePoint;
  const handleStableCenter = useCallback((lat, lng) => {
    updatePointRef.current(lat, lng);
  }, []);

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

  // ── Search ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef(null);

  useEffect(() => {
    if (!showSearch) return undefined;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return undefined;
    }
    if (searchAbortRef.current) {
      try { searchAbortRef.current.abort(); } catch { /* noop */ }
    }
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    setSearching(true);

    const t = setTimeout(() => {
      forwardGeocode(q, { limit: 6, signal: ctrl.signal })
        .then((items) => {
          setSearchResults(items);
          setSearchOpen(true);
        })
        .catch(() => { /* swallow */ })
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      clearTimeout(t);
      try { ctrl.abort(); } catch { /* noop */ }
    };
  }, [searchQuery, showSearch]);

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
                ? 'flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur'
                : 'flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2'
            }
          >
            <Search className="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              placeholder="Search area, landmark or pincode"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              autoComplete="off"
            />
            {searching ? (
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-500" aria-hidden />
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
                <X className="h-3.5 w-3.5" />
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
                  key={`${r.lat}-${r.lng}-${i}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery(r.displayName);
                    recenterMap(r.lat, r.lng, 17);
                    updatePoint(r.lat, r.lng);
                  }}
                  className="flex w-full items-start gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden />
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
        {!mapReady && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gray-50 text-[12px] text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Loading map…
          </div>
        )}
        {mapReady && (
        <MapContainer
          key={containerKey}
          ref={(inst) => { mapInstanceRef.current = inst; }}
          center={[point.lat, point.lng]}
          zoom={zoom}
          scrollWheelZoom
          zoomControl={!isFullscreen}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url={TILE_URL}
            attribution={TILE_ATTRIBUTION}
            maxZoom={19}
          />
          <ZoomTracker onZoomChange={handleZoomChange} />

          {/* User's GPS location marker — non-interactive, sits behind the centre pin. */}
          {userLocation?.lat != null && userLocation?.lng != null && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
              interactive={false}
              keyboard={false}
              zIndexOffset={-200}
            />
          )}

          {/* Store / fulfilment hub marker. */}
          {storeLocation?.lat != null && storeLocation?.lng != null && (
            <Marker
              position={[storeLocation.lat, storeLocation.lng]}
              icon={storeIcon}
              interactive={false}
              keyboard={false}
              zIndexOffset={-100}
            />
          )}

          {centerPinMode ? (
            <MapCenterTracker onStableCenter={handleStableCenter} />
          ) : (
            <>
              <Marker
                position={[point.lat, point.lng]}
                icon={draggablePinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    updatePoint(clampLat(ll.lat), clampLng(ll.lng));
                  },
                }}
              />
              <MapClickHandler
                onPick={(lat, lng) => {
                  updatePoint(lat, lng);
                }}
              />
            </>
          )}
        </MapContainer>
        )}

        {/* Fixed centre pin — map pans underneath (Leaflet marker hidden).
            Width/height grow with zoom-level via scaleForZoom(). */}
        {mapReady && centerPinMode && (
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
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="h-4 w-4" aria-hidden />
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
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
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
