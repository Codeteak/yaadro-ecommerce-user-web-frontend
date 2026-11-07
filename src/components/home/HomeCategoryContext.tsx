"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";

type HomeCategoryContextValue = {
  /** Sample aisle name, or a live category slug. */
  selected: string;
  setSelected: (category: string) => void;
};

const HomeCategoryContext = createContext<HomeCategoryContextValue | null>(null);

/**
 * Shares the rail's selected category with the home product section.
 * Defaults to All, which lists every product already loaded on the page.
 */
export function HomeCategoryProvider({
  children,
  initialSlug = ALL_CATEGORY_SLUG,
}: {
  children: ReactNode;
  initialSlug?: string;
}) {
  const [selected, setSelectedState] = useState(initialSlug);
  const setSelected = useCallback((category: string) => {
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
