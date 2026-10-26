"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { HomeCategory } from "@/lib/home-categories";

type HomeCategoryContextValue = {
  selected: HomeCategory;
  setSelected: (category: HomeCategory) => void;
};

const HomeCategoryContext = createContext<HomeCategoryContextValue | null>(null);

/**
 * Shares the rail's centered category with the home product section.
 * Defaults to Vegetables to match the rail's initial centering.
 */
export function HomeCategoryProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<HomeCategory>("Vegetables");
  const setSelected = useCallback((category: HomeCategory) => {
    setSelectedState(category);
  }, []);

  return (
    <HomeCategoryContext.Provider value={{ selected, setSelected }}>
      {children}
    </HomeCategoryContext.Provider>
  );
}

/** Returns the context, or null when used outside the provider. */
export function useHomeCategoryOptional() {
  return useContext(HomeCategoryContext);
}

export function useHomeCategory() {
  const ctx = useContext(HomeCategoryContext);
  if (!ctx) throw new Error("useHomeCategory must be used within HomeCategoryProvider");
  return ctx;
}
