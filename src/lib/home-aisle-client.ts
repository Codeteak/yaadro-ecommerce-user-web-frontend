"use client";

import { loadHomeAisleProducts } from "@/lib/api/home-aisle";
import type { SampleProduct } from "@/lib/sample-products";

/** Session cache for home-rail aisle peeks (shared across remounts). */
const aisleCache = new Map<string, SampleProduct[]>();
const inflight = new Map<string, Promise<SampleProduct[]>>();

export function peekHomeAisleCache(slug: string): SampleProduct[] | undefined {
  return aisleCache.get(slug);
}

/** Prefetch / load one aisle; dedupes in-flight requests. */
export function fetchHomeAisleProducts(
  slug: string,
): Promise<SampleProduct[]> {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "all") return Promise.resolve([]);

  const cached = aisleCache.get(trimmed);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(trimmed);
  if (pending) return pending;

  const request = loadHomeAisleProducts(trimmed).then((products) => {
    aisleCache.set(trimmed, products);
    inflight.delete(trimmed);
    return products;
  });
  inflight.set(trimmed, request);
  return request;
}

/** Fire-and-forget warm for rail hover / pointerdown. */
export function prefetchHomeAisle(slug: string): void {
  void fetchHomeAisleProducts(slug);
}
