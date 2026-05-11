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

const LocationServiceContext = createContext(null);

export function LocationServiceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { addresses, isLoading: addressesLoading } = useAddress();

  const [phase, setPhase] = useState('idle');
  const [serviceable, setServiceable] = useState(null);
  const [distanceM, setDistanceM] = useState(null);
  const [maxRadiusM, setMaxRadiusM] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSheet, setShowSheet] = useState(false);

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
    (data, point, shopId) => {
      setCoords(point);
      setServiceable(data.serviceable);
      setDistanceM(data.distanceM);
      setMaxRadiusM(data.maxRadiusM);
      setPhase('done');
      saveDeliveryCache({
        serviceable: data.serviceable,
        distanceM: data.distanceM,
        maxRadiusM: data.maxRadiusM,
        coords: { lat: point.lat, lng: point.lng },
        shopId,
        savedAt: Date.now(),
      });
      maybeWarnOutsideZone(data.serviceable);
    },
    [maybeWarnOutsideZone]
  );

  const runCheckAtLatLng = useCallback(
    async (lat, lng) => {
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
        coordsApproxEqual(cached.coords, addressCheckCoords)
      ) {
        setServiceable(cached.serviceable ?? null);
        setDistanceM(cached.distanceM ?? null);
        setMaxRadiusM(cached.maxRadiusM ?? null);
        setCoords(addressCheckCoords);
        setPhase('done');
        setErrorMessage(null);
        setGeoDenied(false);
        return;
      }

      if (cancelled) return;
      await runCheckAtLatLng(addressCheckCoords.lat, addressCheckCoords.lng);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    waitForAddresses,
    addressCheckCoords?.lat,
    addressCheckCoords?.lng,
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
      setPhase('done');
      return;
    }

    runGpsCheck();
  }, [waitForAddresses, addressCheckCoords, runGpsCheck]);

  /** Force-refresh: clears cache and re-runs using saved pin if present, else GPS. */
  const recheckLocation = useCallback(() => {
    clearDeliveryCache();
    gpsLocationCheckInitStarted = false;
    if (addressCheckCoords) {
      setPhase('fetching');
      return runCheckAtLatLng(addressCheckCoords.lat, addressCheckCoords.lng);
    }
    return runGpsCheck();
  }, [addressCheckCoords, runCheckAtLatLng, runGpsCheck]);

  const clearCachedLocation = useCallback(() => {
    clearDeliveryCache();
    gpsLocationCheckInitStarted = false;
    setServiceable(null);
    setDistanceM(null);
    setMaxRadiusM(null);
    setCoords(null);
    setPhase('idle');
  }, []);

  const value = useMemo(
    () => ({
      phase,
      isChecking: phase === 'locating' || phase === 'fetching',
      serviceable,
      distanceM,
      maxRadiusM,
      coords,
      geoDenied,
      errorMessage,
      showServiceAreaSheet: showSheet,
      setShowServiceAreaSheet: setShowSheet,
      recheckLocation,
      clearCachedLocation,
    }),
    [
      phase,
      serviceable,
      distanceM,
      maxRadiusM,
      coords,
      geoDenied,
      errorMessage,
      showSheet,
      recheckLocation,
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
