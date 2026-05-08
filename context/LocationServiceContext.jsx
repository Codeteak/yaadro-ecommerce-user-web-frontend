'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { resolveShopId } from '../utils/authApi';
import { checkDeliveryLocation } from '../utils/storefrontLocationApi';

const SESSION_WARN_KEY = 'yaadro-service-area-warned';
const DELIVERY_CACHE_KEY = 'yaadro-delivery-check-v1';

/** Avoid duplicate geolocation prompts under React Strict Mode (dev). */
let locationCheckInitStarted = false;

/**
 * Persisted delivery check.
 * Once the user has granted location and the API has responded, we never re-prompt
 * or re-call the API automatically — we always read from this cache. The user can
 * still trigger a fresh check explicitly via `recheckLocation()`.
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
  const [phase, setPhase] = useState('idle');
  const [serviceable, setServiceable] = useState(null);
  const [distanceM, setDistanceM] = useState(null);
  const [maxRadiusM, setMaxRadiusM] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSheet, setShowSheet] = useState(false);

  const runCheck = useCallback(async () => {
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
          setServiceable(data.serviceable);
          setDistanceM(data.distanceM);
          setMaxRadiusM(data.maxRadiusM);
          setPhase('done');
          // Persist so we don't re-prompt or re-call the API on subsequent visits.
          saveDeliveryCache({
            serviceable: data.serviceable,
            distanceM: data.distanceM,
            maxRadiusM: data.maxRadiusM,
            coords: { lat, lng },
            shopId,
            savedAt: Date.now(),
          });
          if (!data.serviceable && typeof window !== 'undefined') {
            const warned = sessionStorage.getItem(SESSION_WARN_KEY);
            if (!warned) {
              sessionStorage.setItem(SESSION_WARN_KEY, '1');
              setShowSheet(true);
            }
          }
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
  }, []);

  useEffect(() => {
    if (locationCheckInitStarted) return;
    locationCheckInitStarted = true;

    const cached = loadDeliveryCache();
    if (cached) {
      // Hydrate from localStorage. No geolocation prompt, no API call.
      setServiceable(cached.serviceable ?? null);
      setDistanceM(cached.distanceM ?? null);
      setMaxRadiusM(cached.maxRadiusM ?? null);
      setCoords(cached.coords ?? null);
      setPhase('done');
      return;
    }

    runCheck();
  }, [runCheck]);

  /** Force-refresh: clears the cache and re-runs the full check (will re-prompt). */
  const recheckLocation = useCallback(() => {
    clearDeliveryCache();
    return runCheck();
  }, [runCheck]);

  const clearCachedLocation = useCallback(() => {
    clearDeliveryCache();
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
