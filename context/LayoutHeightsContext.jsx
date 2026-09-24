'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LayoutHeightsContext = createContext({
  bottomNavHeight: 72,
  setBottomNavHeight: () => {},
  siteFooterHeight: 0,
  setSiteFooterHeight: () => {},
});

export function LayoutHeightsProvider({ children }) {
  const [bottomNavHeight, setBottomNavHeightState] = useState(72);
  const [siteFooterHeight, setSiteFooterHeightState] = useState(0);

  const setBottomNavHeight = useCallback((value) => {
    setBottomNavHeightState(typeof value === 'function' ? (prev) => value(prev) : value);
  }, []);

  const setSiteFooterHeight = useCallback((value) => {
    setSiteFooterHeightState(typeof value === 'function' ? (prev) => value(prev) : value);
  }, []);

  const value = useMemo(
    () => ({
      bottomNavHeight,
      setBottomNavHeight,
      siteFooterHeight,
      setSiteFooterHeight,
    }),
    [bottomNavHeight, setBottomNavHeight, siteFooterHeight, setSiteFooterHeight],
  );

  return (
    <LayoutHeightsContext.Provider value={value}>
      {children}
    </LayoutHeightsContext.Provider>
  );
}

export function useLayoutHeights() {
  const ctx = useContext(LayoutHeightsContext);
  return (
    ctx ?? {
      bottomNavHeight: 72,
      setBottomNavHeight: () => {},
      siteFooterHeight: 0,
      setSiteFooterHeight: () => {},
    }
  );
}
