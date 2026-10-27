"use client";

import { createContext, useContext, type ReactNode } from "react";
import { TYPE_SCALE, type TypeScaleId, type TypeScaleTokens } from "@/lib/type-scale";

const TypeScaleContext = createContext<TypeScaleTokens>(TYPE_SCALE.legacy);

/**
 * Design scale for headings/spacing. Storefront + playground use `spec`;
 * default context (no provider) is `legacy`.
 */
export function TypeScaleProvider({
  scale = "legacy",
  children,
}: {
  scale?: TypeScaleId;
  children: ReactNode;
}) {
  return (
    <TypeScaleContext.Provider value={TYPE_SCALE[scale]}>
      {children}
    </TypeScaleContext.Provider>
  );
}

export function useTypeScale(): TypeScaleTokens {
  return useContext(TypeScaleContext);
}
