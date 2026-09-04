'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertRegular as AlertTriangle,
  ArrowLeftRegular as ArrowLeft,
  CheckCircleRegular as CheckCircle2,
  Loading2Regular as Loader2,
  MapPinRegular as MapPin,
  NavigationRegular as Navigation,
} from './icons';
import { useLocationService } from '../context/LocationServiceContext';
import { checkDeliveryLocation } from '../utils/storefrontLocationApi';
import { getDefaultMapCenter } from '../utils/geocoding';
import { getStoreCoordinates } from '../utils/storeLocation';
import AnimatedSheet from './motion/AnimatedSheet';

const AddressMapPicker = dynamic(() => import('./AddressMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
      <Loader2 size={20} className="mr-2 h-5 w-5 animate-spin" />
      Loading map…
    </div>
  ),
});

const DELIVERY_RADIUS_FALLBACK_M =
  Number(process.env.NEXT_PUBLIC_DELIVERY_RADIUS_FALLBACK_M) || 8000;

function formatKm(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function formatCoords(point) {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function SavedCoordinatesCard({ coords, label = 'Saved coordinates' }) {
  const formatted = formatCoords(coords);
  if (!formatted) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{formatted}</p>
    </div>
  );
}

export default function ServiceAreaBottomSheet() {
  const {
    isChecking,
    serviceable,
    distanceM,
    maxRadiusM,
    coords,
    shopLocation: contextShopLocation,
    geoDenied,
    errorMessage,
    showServiceAreaSheet,
    closeServiceAreaSheet,
    locationSourceLabel,
    locationSourceKind,
    requestMyLocation,
    confirmLocationAtPin,
  } = useLocationService();

  const [mapMode, setMapMode] = useState(false);
  const [draftPin, setDraftPin] = useState(null);
  const [pinPreview, setPinPreview] = useState({
    loading: false,
    serviceable: null,
    distanceM: null,
    maxRadiusM: null,
    shopLocation: null,
    error: null,
  });

  useEffect(() => {
    document.body.style.overflow = showServiceAreaSheet ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showServiceAreaSheet]);

  useEffect(() => {
    if (!showServiceAreaSheet) {
      setMapMode(false);
      setDraftPin(null);
      setPinPreview({
        loading: false,
        serviceable: null,
        distanceM: null,
        maxRadiusM: null,
        shopLocation: null,
        error: null,
      });
    }
  }, [showServiceAreaSheet]);

  useEffect(() => {
    if (!mapMode || !draftPin?.lat || !draftPin?.lng) {
      setPinPreview({
        loading: false,
        serviceable: null,
        distanceM: null,
        maxRadiusM: null,
        shopLocation: null,
        error: null,
      });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPinPreview((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await checkDeliveryLocation(draftPin.lat, draftPin.lng);
        if (cancelled) return;
        setPinPreview({
          loading: false,
          serviceable: !!data.serviceable,
          distanceM: data.distanceM,
          maxRadiusM: data.maxRadiusM,
          shopLocation: data.shopLocation ?? null,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setPinPreview({
          loading: false,
          serviceable: null,
          distanceM: null,
          maxRadiusM: null,
          shopLocation: null,
          error: e?.message || 'Could not verify delivery area.',
        });
      }
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapMode, draftPin?.lat, draftPin?.lng]);

  const initialMapPin = useMemo(() => {
    if (coords?.lat != null && coords?.lng != null) {
      return { lat: coords.lat, lng: coords.lng };
    }
    return getDefaultMapCenter();
  }, [coords?.lat, coords?.lng]);

  const mapDeliveryRadiusM =
    pinPreview.maxRadiusM ??
    (typeof maxRadiusM === 'number' && maxRadiusM > 0 ? maxRadiusM : null) ??
    DELIVERY_RADIUS_FALLBACK_M;

  const effectiveStoreLocation = useMemo(() => {
    if (pinPreview.shopLocation?.lat != null && pinPreview.shopLocation?.lng != null) {
      return pinPreview.shopLocation;
    }
    if (contextShopLocation?.lat != null && contextShopLocation?.lng != null) {
      return contextShopLocation;
    }
    return getStoreCoordinates();
  }, [pinPreview.shopLocation, contextShopLocation]);

  const openMapMode = useCallback(() => {
    setDraftPin(initialMapPin);
    setMapMode(true);
  }, [initialMapPin]);

  const handleConfirmPin = useCallback(async () => {
    if (!draftPin?.lat || !draftPin?.lng) return;
    await confirmLocationAtPin(draftPin.lat, draftPin.lng);
    setMapMode(false);
  }, [confirmLocationAtPin, draftPin]);

  if (!showServiceAreaSheet) return null;

  const onClose = () => closeServiceAreaSheet();

  const sheetProps = {
    onClose,
    isChecking,
    serviceable,
    distanceM,
    maxRadiusM,
    geoDenied,
    errorMessage,
    locationSourceLabel,
    locationSourceKind,
    coords,
    requestMyLocation,
    mapMode,
    onOpenMapMode: openMapMode,
    onCloseMapMode: () => setMapMode(false),
    draftPin,
    onDraftPinChange: setDraftPin,
    initialMapPin,
    effectiveStoreLocation,
    mapDeliveryRadiusM,
    pinPreview,
    onConfirmPin: handleConfirmPin,
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[68]"
        style={{ backdropFilter: 'none' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <AnimatedSheet
        className="md:hidden fixed bottom-0 left-0 right-0 z-[69] bg-white rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '92vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <SheetBody {...sheetProps} />
      </AnimatedSheet>

      <div className="hidden md:flex fixed inset-0 z-[69] items-center justify-center px-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl pointer-events-auto"
          style={{ animation: 'serviceAreaScaleIn 0.25s cubic-bezier(0.32, 0.72, 0, 1) both' }}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetBody {...sheetProps} />
        </div>
      </div>

      <style>{`
        @keyframes serviceAreaSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes serviceAreaScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

function SheetBody({
  onClose,
  isChecking,
  serviceable,
  distanceM,
  maxRadiusM,
  geoDenied,
  errorMessage,
  locationSourceLabel,
  locationSourceKind,
  coords,
  requestMyLocation,
  mapMode,
  onOpenMapMode,
  onCloseMapMode,
  draftPin,
  onDraftPinChange,
  initialMapPin,
  effectiveStoreLocation,
  mapDeliveryRadiusM,
  pinPreview,
  onConfirmPin,
}) {
  const distLabel = formatKm(distanceM);
  const radiusLabel = formatKm(maxRadiusM);
  const usesDeviceLocation = (locationSourceLabel || '').includes('current location');
  const usesPinnedLocation =
    locationSourceKind === 'pin' || (locationSourceLabel || '').includes('pinned location');
  const inZoneTitle = usesDeviceLocation
    ? 'We deliver to your area'
    : usesPinnedLocation
      ? 'We deliver to this spot'
      : 'We deliver to this address';
  const inZoneDetail = usesDeviceLocation
    ? distLabel
      ? `About ${distLabel} from the store.`
      : 'Your location is inside our service zone.'
    : usesPinnedLocation
      ? distLabel
        ? `Your pin is about ${distLabel} from the store.`
        : 'This spot is inside our service zone.'
      : distLabel
        ? `The map pin is about ${distLabel} from the store.`
        : 'This map pin is inside our service zone.';

  if (mapMode) {
    return (
      <div className="px-4 pb-8 pt-2 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={onCloseMapMode}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
            aria-label="Back"
          >
            <ArrowLeft size={16} className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 leading-tight">Pin your location</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pan the map to place the pin on your delivery spot</p>
          </div>
        </div>

        <AddressMapPicker
          value={draftPin ?? initialMapPin}
          onChange={onDraftPinChange}
          height={280}
          showSearch
          centerPinMode
          storeLocation={effectiveStoreLocation}
          showStoreMarker
          deliveryRadiusM={mapDeliveryRadiusM}
          fitDeliveryZone
        />

        <div
          className={`mt-3 rounded-xl border px-3 py-3 ${
            pinPreview.loading
              ? 'border-gray-200 bg-gray-50 text-gray-800'
              : pinPreview.error
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : pinPreview.serviceable === true
                  ? 'border-violet-200 bg-violet-50 text-violet-950'
                  : pinPreview.serviceable === false
                    ? 'border-red-200 bg-red-50 text-red-950'
                    : 'border-gray-200 bg-gray-50 text-gray-800'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Delivery at map pin
          </p>
          {pinPreview.loading && (
            <p className="mt-1 flex items-center gap-2 text-[13px] font-medium">
              <Loader2 size={14} className="h-3.5 w-3.5 animate-spin" />
              Checking whether we deliver here…
            </p>
          )}
          {!pinPreview.loading && pinPreview.error && (
            <p className="mt-1 text-[13px] font-medium">{pinPreview.error}</p>
          )}
          {!pinPreview.loading && !pinPreview.error && pinPreview.serviceable === true && (
            <p className="mt-1 text-[14px] font-bold text-violet-900">Delivery available at this spot</p>
          )}
          {!pinPreview.loading && !pinPreview.error && pinPreview.serviceable === false && (
            <p className="mt-1 text-[13px] font-semibold">
              Outside delivery zone — move the map so the pin sits inside the green area.
            </p>
          )}
          {!pinPreview.loading && !pinPreview.error && pinPreview.serviceable == null && (
            <p className="mt-1 text-[13px] font-medium text-gray-600">
              Pan the map; we’ll check this spot automatically.
            </p>
          )}
          {formatCoords(draftPin ?? initialMapPin) && (
            <p className="mt-2 font-mono text-[11px] text-gray-500">
              Pin: {formatCoords(draftPin ?? initialMapPin)}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirmPin}
            disabled={pinPreview.loading || !draftPin}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
          >
            <CheckCircle2 size={16} className="h-4 w-4" />
            Use this location
          </button>
          <button
            type="button"
            onClick={() => {
              onCloseMapMode();
              requestMyLocation();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Navigation size={16} className="h-4 w-4" />
            Use my location instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-2 max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <MapPin size={20} className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Delivery area</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Based on {locationSourceLabel || 'your current location'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {coords && (
        <SavedCoordinatesCard
          coords={coords}
          label={
            locationSourceKind === 'pin' || usesPinnedLocation
              ? 'Pinned location'
              : 'Checked location'
          }
        />
      )}

      {isChecking && (
        <div className="mb-4">
          <div className="flex items-center gap-3 py-6 justify-center text-gray-600">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-sm font-medium">Checking delivery availability…</span>
          </div>
          <p className="text-center text-xs text-gray-500">
            Taking too long? You can pin your location on the map instead.
          </p>
        </div>
      )}

      {!isChecking && geoDenied && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle size={24} className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Location access needed</p>
              <p className="text-sm text-gray-600 mt-1">
                Allow location in your browser settings, or pin your delivery spot on the map manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isChecking && !geoDenied && errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {!isChecking && !geoDenied && serviceable === true && (
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 mb-4">
          <div className="flex gap-3">
            <CheckCircle2 size={24} className="w-6 h-6 text-violet-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{inZoneTitle}</p>
              <p className="text-sm text-gray-600 mt-1">{inZoneDetail}</p>
            </div>
          </div>
        </div>
      )}

      {!isChecking && !geoDenied && serviceable === false && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle size={24} className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Outside delivery zone</p>
              <p className="text-sm text-gray-600 mt-1">
                {distLabel && radiusLabel
                  ? `This point is about ${distLabel} away; we currently deliver within about ${radiusLabel}.`
                  : 'This location is outside our delivery area. Try pinning a different spot on the map.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
          How should we check?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => requestMyLocation()}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            <Navigation size={16} className="w-4 h-4" />
            Use my location
          </button>
          <button
            type="button"
            onClick={onOpenMapMode}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-800 hover:bg-violet-100"
          >
            <MapPin size={16} className="w-4 h-4" />
            Pin on map manually
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
