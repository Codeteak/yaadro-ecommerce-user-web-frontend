"use client";

import { createContext, useContext, type ReactNode } from "react";

const ShopNameContext = createContext("Yaadro");

export function ShopNameProvider({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return <ShopNameContext.Provider value={name}>{children}</ShopNameContext.Provider>;
}

export function useShopName(): string {
  return useContext(ShopNameContext);
}
