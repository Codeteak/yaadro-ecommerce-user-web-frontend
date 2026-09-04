'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { resolveShopId } from '../utils/authApi';
import { checkDeliveryLocation } from '../utils/storefrontLocationApi';
import { useAuth } from './AuthContext';
import { useAddress } from './AddressContext';

const SESSION_WARN_KEY = 'yaadro-service-area-warned';
const DELIVERY_CACHE_KEY = 'yaadro-delivery-check-v1';

/** ~11 m — treat cached coords as the same delivery point as the saved address pin. */
const COORD_MATCH_EPS = 1e-4;

function coordsApproxEqual(a, b) {
  if (!a || !b) return false;
  const la = Number(a.lat);
  const ln = Number(a.lng);
  const lb = Number(b.lat);
  const mb = Number(b.lng);
  if (![la, ln, lb, mb].every((n) => Number.isFinite(n))) return false;
  return Math.abs(la - lb) < COORD_MATCH_EPS && Math.abs(ln - mb) < COORD_MATCH_EPS;
}

/** Avoid duplicate geolocation prompts under React Strict Mode (dev). */
let gpsLocationCheckInitStarted = false;

/**
 * Persisted delivery check.
 * When no saved address coordinates exist, we cache the GPS-based result so we
 * do not re-prompt on every visit. Saved-address checks use the same cache when
 * the stored coords match the default address pin (same API as the map picker).
 */
function loadDeliveryCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DELIVERY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDeliveryCache(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DELIVERY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / disabled — silently ignore */
  }
}

function clearDeliveryCache() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DELIVERY_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** @typedef {'gps' | 'pin' | 'address'} LocationSourceKind */

function inferSourceKindFromCache(cached) {
  if (!cached || typeof cached !== 'object') return 'gps';
  if (cached.sourceKind === 'pin' || cached.sourceKind === 'address' || cached.sourceKind === 'gps') {
    return cached.sourceKind;
  }
  if (cached.addressId != null && cached.addressId !== '') return 'address';
  return 'gps';
}

function sourceKindToLabel(kind) {
  if (kind === 'pin') return 'your pinned location';
  if (kind === 'address') return 'your saved delivery address';
  return 'your current location';
}

const LocationServiceContext = createContext(null);

export function LocationServiceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { addresses, isLoading: addressesLoading } = useAddress();

  const [phase, setPhase] = useState('idle');
  const [serviceable, setServiceable] = useState(null);
  const [distanceM, setDistanceM] = useState(null);
  const [maxRadiusM, setMaxRadiusM] = useState(null);
  const [coords, setCoords] = useState(null);
  const [shopLocation, setShopLocation] = useState(null);
  /** How the active delivery check coords were chosen. */
  const [locationSourceKind, setLocationSourceKind] = useState('gps');
  const [geoDenied, setGeoDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSheet, setShowSheet] = useState(false);

  /** When set, the delivery-area sheet shows a one-off check for this pin (e.g. checkout address). */
  const [sheetPin, setSheetPin] = useState(null);
  const [sheetPhase, setSheetPhase] = useState('idle');
  const [sheetServiceable, setSheetServiceable] = useState(null);
  const [sheetDistanceM, setSheetDistanceM] = useState(null);
  const [sheetMaxRadiusM, setSheetMaxRadiusM] = useState(null);
  const [sheetErrorMessage, setSheetErrorMessage] = useState(null);

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) || addresses[0] || null,
    [addresses]
  );

  /** Same point the map / add-address flow uses for `checkDeliveryLocation`. */
  const addressCheckCoords = useMemo(() => {
    if (!defaultAddress) return null;
    const lat = Number(defaultAddress.lat);
    const lng = Number(defaultAddress.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [defaultAddress]);

  const maybeWarnOutsideZone = useCallback((inZone) => {
    if (inZone || typeof window === 'undefined') return;
    const warned = sessionStorage.getItem(SESSION_WARN_KEY);
    if (!warned) {
      sessionStorage.setItem(SESSION_WARN_KEY, '1');
      setShowSheet(true);
    }
  }, []);

  const applyDeliveryResult = useCallback(
    (data, point, shopId, linkedAddressId = null, sourceKind = 'gps') => {
      setCoords(point);
      setServiceable(data.serviceable);
      setDistanceM(data.distanceM);
      setMaxRadiusM(data.maxRadiusM);
      setLocationSourceKind(sourceKind);
      if (data.shopLocation?.lat != null && data.shopLocation?.lng != null) {
        setShopLocation(data.shopLocation);
      }
      setPhase('done');
      saveDeliveryCache({
        serviceable: data.serviceable,
        distanceM: data.distanceM,
        maxRadiusM: data.maxRadiusM,
        coords: { lat: point.lat, lng: point.lng },
        shopId,
        sourceKind,
        savedAt: Date.now(),
        ...(data.shopLocation?.lat != null && data.shopLocation?.lng != null
          ? { shopLocation: data.shopLocation }
          : {}),
        ...(linkedAddressId != null && linkedAddressId !== ''
          ? { addressId: String(linkedAddressId) }
          : {}),
      });
      maybeWarnOutsideZone(data.serviceable);
    },
    [maybeWarnOutsideZone]
  );

  const runCheckAtLatLng = useCallback(
    async (lat, lng, linkedAddressId = null) => {
      const shopId = await resolveShopId();
      if (!shopId) {
        setPhase('done');
        setServiceable(null);
        setErrorMessage(null);
        return;
      }
      setPhase('fetching');
      setErrorMessage(null);
      setGeoDenied(false);
      try {
        const data = await checkDeliveryLocation(lat, lng);
        applyDeliveryResult(
          data,
          { lat, lng },
          shopId,
          linkedAddressId,
          linkedAddressId != null && linkedAddressId !== '' ? 'address' : 'gps'
        );
      } catch (e) {
        const msg = e?.message || 'Could not verify delivery area.';
        setPhase('done');
        setServiceable(null);
        if (e?.code === 'MISSING_SHOP_ID') {
          setErrorMessage(null);
        } else {
          setErrorMessage(msg);
        }
      }
    },
    [applyDeliveryResult]
  );

  const runGpsCheck = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const shopId = await resolveShopId();
    if (!shopId) {
      setPhase('done');
      setServiceable(null);
      setErrorMessage(null);
      return;
    }

    if (!navigator.geolocation) {
      setPhase('done');
      setErrorMessage('Location is not supported in this browser.');
      return;
    }

    setPhase('locating');
    setErrorMessage(null);
    setGeoDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setPhase('fetching');
        try {
          const data = await checkDeliveryLocation(lat, lng);
          applyDeliveryResult(data, { lat, lng }, shopId);
        } catch (e) {
          const msg = e?.message || 'Could not verify delivery area.';
          setPhase('done');
          setServiceable(null);
          if (e?.code === 'MISSING_SHOP_ID') {
            setErrorMessage(null);
          } else {
            setErrorMessage(msg);
          }
        }
      },
      (err) => {
        setPhase('done');
        if (err?.code === 1) {
          setGeoDenied(true);
          setServiceable(null);
        } else {
          setErrorMessage(err?.message || 'Could not read your location.');
          setServiceable(null);
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, [applyDeliveryResult]);

  const waitForAddresses = isAuthenticated && addressesLoading;

  /** Default-address pin — same API coords as the map “delivery available” strip. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (waitForAddresses) return;
    if (!addressCheckCoords) return;

    let cancelled = false;

    (async () => {
      const shopId = await resolveShopId();
      if (!shopId || cancelled) {
        if (!cancelled) {
          setPhase('done');
          setServiceable(null);
        }
        return;
      }

      const cached = loadDeliveryCache();
      if (
        cached &&
        cached.shopId === shopId &&
        cached.coords &&
        coordsApproxEqual(cached.coords, addressCheckCoords) &&
        String(cached.addressId ?? '') === String(defaultAddress?.id ?? '')
      ) {
        setServiceable(cached.serviceable ?? null);
        setDistanceM(cached.distanceM ?? null);
        setMaxRadiusM(cached.maxRadiusM ?? null);
        setCoords(addressCheckCoords);
        if (cached.shopLocation?.lat != null && cached.shopLocation?.lng != null) {
          setShopLocation(cached.shopLocation);
        }
        setLocationSourceKind('address');
        setPhase('done');
        setErrorMessage(null);
        setGeoDenied(false);
        return;
      }

      if (cancelled) return;
      await runCheckAtLatLng(addressCheckCoords.lat, addressCheckCoords.lng, defaultAddress?.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    waitForAddresses,
    addressCheckCoords?.lat,
    addressCheckCoords?.lng,
    defaultAddress?.id,
    runCheckAtLatLng,
  ]);

  const hadSavedPinRef = useRef(false);

  /** GPS + cache path only when there is no saved address pin to check. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (waitForAddresses) return;
    if (addressCheckCoords) {
      hadSavedPinRef.current = true;
      return;
    }

    if (hadSavedPinRef.current) {
      hadSavedPinRef.current = false;
      gpsLocationCheckInitStarted = false;
      // Old cache was for the saved pin — do not treat it as the user’s current GPS check.
      clearDeliveryCache();
    }

    if (gpsLocationCheckInitStarted) return;
    gpsLocationCheckInitStarted = true;

    const cached = loadDeliveryCache();
    if (cached) {
      setServiceable(cached.serviceable ?? null);
      setDistanceM(cached.distanceM ?? null);
      setMaxRadiusM(cached.maxRadiusM ?? null);
      setCoords(cached.coords ?? null);
      if (cached.shopLocation?.lat != null && cached.shopLocation?.lng != null) {
        setShopLocation(cached.shopLocation);
      }
      setLocationSourceKind(inferSourceKindFromCache(cached));
      setPhase('done');
      return;
    }

    runGpsCheck();
  }, [waitForAddresses, addressCheckCoords, runGpsCheck]);

  /** Force-refresh: clears cache and re-runs using saved pin if present, else GPS. */
  const runSheetPinCheck = useCallback(async (pin) => {
    const lat = Number(pin?.lat);
    const lng = Number(pin?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSheetPhase('fetching');
    setSheetErrorMessage(null);
    setSheetServiceable(null);
    try {
      const data = await checkDeliveryLocation(lat, lng);
      setSheetServiceable(data.serviceable);
      setSheetDistanceM(data.distanceM);
      setSheetMaxRadiusM(data.maxRadiusM);
      if (data.shopLocation?.lat != null && data.shopLocation?.lng != null) {
        setShopLocation(data.shopLocation);
      }
      setSheetPhase('done');
    } catch (e) {
      setSheetPhase('done');
      setSheetServiceable(null);
      setSheetDistanceM(null);
      setSheetMaxRadiusM(null);
      setSheetErrorMessage(e?.message || 'Could not verify delivery area.');
    }
  }, []);

  /**
   * Open the delivery-area sheet. Pass `{ lat, lng, addressId?, label? }` to check a
   * specific pin (checkout selected address) instead of GPS / default address.
   */
  const openServiceAreaSheet = useCallback(
    (pinOptions) => {
      const lat = Number(pinOptions?.lat);
      const lng = Number(pinOptions?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const pin = {
          lat,
          lng,
          addressId: pinOptions?.addressId ?? null,
          label: pinOptions?.label || 'your delivery address pin',
        };
        setSheetPin(pin);
        setShowSheet(true);
        void runSheetPinCheck(pin);
        return;
      }
      setSheetPin(null);
      setShowSheet(true);
    },
    [runSheetPinCheck]
  );

  const closeServiceAreaSheet = useCallback(() => {
    setShowSheet(false);
    setSheetPin(null);
    setSheetPhase('idle');
    setSheetServiceable(null);
    setSheetDistanceM(null);
    setSheetMaxRadiusM(null);
    setSheetErrorMessage(null);
  }, []);

  const recheckLocation = useCallback(() => {
    if (sheetPin) {
      return runSheetPinCheck(sheetPin);
    }
    clearDeliveryCache();
    gpsLocationCheckInitStarted = false;
    if (addressCheckCoords) {
      setPhase('fetching');
      return runCheckAtLatLng(addressCheckCoords.lat, addressCheckCoords.lng, defaultAddress?.id ?? null);
    }
    return runGpsCheck();
  }, [
    sheetPin,
    runSheetPinCheck,
    addressCheckCoords,
    defaultAddress?.id,
    runCheckAtLatLng,
    runGpsCheck,
  ]);

  /** Re-run delivery check using device GPS (clears manual pin / saved-address sheet mode). */
  const useMyLocation = useCallback(() => {
    setSheetPin(null);
    setSheetPhase('idle');
    setSheetServiceable(null);
    setSheetDistanceM(null);
    setSheetMaxRadiusM(null);
    setSheetErrorMessage(null);
    clearDeliveryCache();
    gpsLocationCheckInitStarted = false;
    if (addressCheckCoords) {
      setPhase('fetching');
      return runCheckAtLatLng(addressCheckCoords.lat, addressCheckCoords.lng, defaultAddress?.id ?? null);
    }
    return runGpsCheck();
  }, [addressCheckCoords, defaultAddress?.id, runCheckAtLatLng, runGpsCheck]);

  /** Check delivery at a user-pinned map location and persist the result. */
  const confirmLocationAtPin = useCallback(
    async (lat, lng) => {
      const la = Number(lat);
      const ln = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) return;

      const shopId = await resolveShopId();
      if (!shopId) {
        setPhase('done');
        setServiceable(null);
        return;
      }

      const pin = { lat: la, lng: ln, label: 'your pinned location' };
      setSheetPin(pin);
      setSheetPhase('fetching');
      setSheetErrorMessage(null);
      setSheetServiceable(null);
      setPhase('fetching');
      setErrorMessage(null);
      setGeoDenied(false);

      try {
        const data = await checkDeliveryLocation(la, ln);
        applyDeliveryResult(data, { lat: la, lng: ln }, shopId, null, 'pin');
        setSheetServiceable(data.serviceable);
        setSheetDistanceM(data.distanceM);
        setSheetMaxRadiusM(data.maxRadiusM);
        if (data.shopLocation?.lat != null && data.shopLocation?.lng != null) {
          setShopLocation(data.shopLocation);
        }
        setSheetPhase('done');
      } catch (e) {
        const msg = e?.message || 'Could not verify delivery area.';
        setPhase('done');
        setServiceable(null);
        setSheetPhase('done');
        setSheetServiceable(null);
        setSheetDistanceM(null);
        setSheetMaxRadiusM(null);
        if (e?.code === 'MISSING_SHOP_ID') {
          setErrorMessage(null);
          setSheetErrorMessage(null);
        } else {
          setErrorMessage(msg);
          setSheetErrorMessage(msg);
        }
      }
    },
    [applyDeliveryResult]
  );

  const clearCachedLocation = useCallback(() => {
    clearDeliveryCache();
    gpsLocationCheckInitStarted = false;
    setServiceable(null);
    setDistanceM(null);
    setMaxRadiusM(null);
    setCoords(null);
    setShopLocation(null);
    setLocationSourceKind('gps');
    setPhase('idle');
  }, []);

  const sheetActive = Boolean(sheetPin && showSheet);

  const displayIsChecking = sheetActive
    ? sheetPhase === 'fetching'
    : phase === 'locating' || phase === 'fetching';

  const displayServiceable = sheetActive ? sheetServiceable : serviceable;
  const displayDistanceM = sheetActive ? sheetDistanceM : distanceM;
  const displayMaxRadiusM = sheetActive ? sheetMaxRadiusM : maxRadiusM;
  const displayGeoDenied = sheetActive ? false : geoDenied;
  const displayErrorMessage = sheetActive ? sheetErrorMessage : errorMessage;

  const locationSourceLabel = sheetActive
    ? sheetPin?.label || sourceKindToLabel(locationSourceKind)
    : sourceKindToLabel(
        addressCheckCoords && locationSourceKind !== 'pin'
          ? 'address'
          : locationSourceKind
      );

  const displayCoords = useMemo(() => {
    if (sheetActive && sheetPin?.lat != null && sheetPin?.lng != null) {
      return { lat: sheetPin.lat, lng: sheetPin.lng };
    }
    if (coords?.lat != null && coords?.lng != null) {
      return { lat: coords.lat, lng: coords.lng };
    }
    return null;
  }, [sheetActive, sheetPin, coords]);

  const value = useMemo(
    () => ({
      phase,
      isChecking: displayIsChecking,
      serviceable: displayServiceable,
      distanceM: displayDistanceM,
      maxRadiusM: displayMaxRadiusM,
      coords: displayCoords,
      locationSourceKind,
      shopLocation,
      geoDenied: displayGeoDenied,
      errorMessage: displayErrorMessage,
      locationSourceLabel,
      sheetUsesDeliveryPin: sheetActive,
      showServiceAreaSheet: showSheet,
      openServiceAreaSheet,
      closeServiceAreaSheet,
      setShowServiceAreaSheet: (open) => {
        if (open) openServiceAreaSheet();
        else closeServiceAreaSheet();
      },
      recheckLocation,
      useMyLocation,
      confirmLocationAtPin,
      clearCachedLocation,
    }),
    [
      phase,
      displayIsChecking,
      displayServiceable,
      displayDistanceM,
      displayMaxRadiusM,
      displayCoords,
      locationSourceKind,
      shopLocation,
      displayGeoDenied,
      displayErrorMessage,
      locationSourceLabel,
      sheetActive,
      showSheet,
      openServiceAreaSheet,
      closeServiceAreaSheet,
      recheckLocation,
      useMyLocation,
      confirmLocationAtPin,
      clearCachedLocation,
    ]
  );

  return (
    <LocationServiceContext.Provider value={value}>{children}</LocationServiceContext.Provider>
  );
}

export function useLocationService() {
  const ctx = useContext(LocationServiceContext);
  if (!ctx) {
    throw new Error('useLocationService must be used within LocationServiceProvider');
  }
  return ctx;
}
