"use client";

import { loadHomeAisleProducts } from "@/lib/api/home-aisle";
import type { SampleProduct } from "@/lib/sample-products";

/** Session cache for home-rail aisle peeks (shared across remounts). */
const aisleCache = new Map<string, SampleProduct[]>();
const inflight = new Map<string, Promise<SampleProduct[]>>();

let cacheVersion = 0;
const listeners = new Set<() => void>();

function emitCacheChange() {
  cacheVersion += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeHomeAisleCache(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHomeAisleCacheVersion(): number {
  return cacheVersion;
}

export function getHomeAisleCacheServerVersion(): number {
  return 0;
}

export function peekHomeAisleCache(slug: string): SampleProduct[] | undefined {
  return aisleCache.get(slug);
}

/** Prefetch / load one aisle; dedupes in-flight requests. */
export function fetchHomeAisleProducts(
  slug: string,
): Promise<SampleProduct[]> {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "all") return Promise.resolve([]);

  if (aisleCache.has(trimmed)) {
    return Promise.resolve(aisleCache.get(trimmed)!);
  }

  const pending = inflight.get(trimmed);
  if (pending) return pending;

  const request = loadHomeAisleProducts(trimmed)
    .then((products) => {
      aisleCache.set(trimmed, products);
      inflight.delete(trimmed);
      emitCacheChange();
      return products;
    })
    .catch(() => {
      // Don't poison inflight — allow retry; treat as empty aisle.
      const empty: SampleProduct[] = [];
      aisleCache.set(trimmed, empty);
      inflight.delete(trimmed);
      emitCacheChange();
      return empty;
    });

  inflight.set(trimmed, request);
  return request;
}

/** Fire-and-forget warm for rail hover / pointerdown. */
export function prefetchHomeAisle(slug: string): void {
  void fetchHomeAisleProducts(slug);
}
