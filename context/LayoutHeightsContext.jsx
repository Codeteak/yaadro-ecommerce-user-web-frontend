'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const LayoutHeightsContext = createContext({
  navbarHeight: 140,
  bottomNavHeight: 72,
  setNavbarHeight: () => {},
  setBottomNavHeight: () => {},
});

export function LayoutHeightsProvider({ children }) {
  const [navbarHeight, setNavbarHeightState] = useState(140);
  const [bottomNavHeight, setBottomNavHeightState] = useState(72);

  const setNavbarHeight = useCallback((value) => {
    setNavbarHeightState(typeof value === 'function' ? (prev) => value(prev) : value);
  }, []);

  const setBottomNavHeight = useCallback((value) => {
    setBottomNavHeightState(typeof value === 'function' ? (prev) => value(prev) : value);
  }, []);

  return (
    <LayoutHeightsContext.Provider
      value={{
        navbarHeight,
        bottomNavHeight,
        setNavbarHeight,
        setBottomNavHeight,
      }}
    >
      {children}
    </LayoutHeightsContext.Provider>
  );
}

export function useLayoutHeights() {
  const ctx = useContext(LayoutHeightsContext);
  return (
    ctx ?? {
      navbarHeight: 140,
      bottomNavHeight: 72,
      setNavbarHeight: () => {},
      setBottomNavHeight: () => {},
    }
  );
}
