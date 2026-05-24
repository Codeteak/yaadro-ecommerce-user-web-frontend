'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const LayoutHeightsContext = createContext({
  bottomNavHeight: 72,
  setBottomNavHeight: () => {},
});

export function LayoutHeightsProvider({ children }) {
  const [bottomNavHeight, setBottomNavHeightState] = useState(72);

  const setBottomNavHeight = useCallback((value) => {
    setBottomNavHeightState(typeof value === 'function' ? (prev) => value(prev) : value);
  }, []);

  return (
    <LayoutHeightsContext.Provider
      value={{
        bottomNavHeight,
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
      bottomNavHeight: 72,
      setBottomNavHeight: () => {},
    }
  );
}
