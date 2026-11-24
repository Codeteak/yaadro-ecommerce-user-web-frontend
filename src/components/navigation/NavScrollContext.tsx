"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useScrollDirection } from "@/components/navigation/useScrollDirection";

type NavScrollValue = ReturnType<typeof useScrollDirection>;

const NavScrollContext = createContext<NavScrollValue | null>(null);

/** One scroll listener for chrome padding + BottomNav + ViewCartBar. */
export function NavScrollProvider({ children }: { children: ReactNode }) {
  const value = useScrollDirection();
  return (
    <NavScrollContext.Provider value={value}>{children}</NavScrollContext.Provider>
  );
}

/**
 * Prefers the storefront provider; playground / demos without a provider
 * fall back to a local listener (hooks stay unconditional).
 */
export function useNavScroll(): NavScrollValue {
  const shared = useContext(NavScrollContext);
  const local = useScrollDirection(shared == null);
  return shared ?? local;
}
