"use client";

import { Suspense, use, useSyncExternalStore, type ReactNode } from "react";
import { loadOnce, readPageCache, subscribePageCache } from "@/lib/page-cache";

/**
 * Shows the saved page immediately. Calls `load` only when this key has never loaded.
 * Render this from a client-only screen so the server does not fetch on every visit.
 */
export function CachedSlot<T>({
  cacheKey,
  load,
  persist,
  fallback,
  children,
}: {
  cacheKey: string;
  load: () => Promise<T>;
  persist: (value: T) => boolean;
  fallback: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const cached = useSyncExternalStore(
    subscribePageCache,
    () => readPageCache<T>(cacheKey),
    () => null,
  );

  if (cached) return children(cached);

  return (
    <Suspense fallback={fallback}>
      <SlotMiss cacheKey={cacheKey} load={load} persist={persist}>
        {children}
      </SlotMiss>
    </Suspense>
  );
}

function SlotMiss<T>({
  cacheKey,
  load,
  persist,
  children,
}: {
  cacheKey: string;
  load: () => Promise<T>;
  persist: (value: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  const data = use(loadOnce(cacheKey, load, persist));
  return children(data);
}
