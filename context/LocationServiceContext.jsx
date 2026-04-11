'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getShopIdFromEnv } from '../utils/authApi';
import { checkDeliveryLocation } from '../utils/storefrontLocationApi';

const SESSION_WARN_KEY = 'yaadro-service-area-warned';

/** Avoid duplicate geolocation prompts under React Strict Mode (dev). */
let locationCheckInitStarted = false;

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

  const runCheck = useCallback(() => {
    if (typeof window === 'undefined') return;

    const shopId = getShopIdFromEnv();
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
    runCheck();
  }, [runCheck]);

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
      recheckLocation: runCheck,
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
      runCheck,
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
