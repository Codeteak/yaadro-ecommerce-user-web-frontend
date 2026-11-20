/**
 * Remember a page after it loads.
 * A later visit reads this copy and does not call the shop again.
 * Tokens are never stored here.
 */

import { resolveClientShopId } from "@/lib/resolved-shop";

const PREFIX = "yaadro.page.v1";

type MemoryEntry = { raw: string; value: unknown };

const memory = new Map<string, MemoryEntry>();
const session = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

function storageKey(key: string) {
  const shop = resolveClientShopId() || "default";
  return `${PREFIX}:${shop}:${key}`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const hit = memory.get(key);
    if (hit?.raw === raw) return hit.value as T;
    const value = JSON.parse(raw) as T;
    memory.set(key, { raw, value });
    return value;
  } catch {
    return null;
  }
}

export function readPageCache<T>(key: string): T | null {
  if (session.has(key)) return session.get(key) as T;
  return readStored<T>(key);
}

/** Keep the latest copy. `persist` writes localStorage so the next visit can skip the network. */
export function rememberPage<T>(key: string, value: T, persist: boolean) {
  if (!persist) {
    if (session.has(key) || readStored(key)) return;
    session.set(key, value);
    notify();
    return;
  }

  session.set(key, value);
  try {
    const raw = JSON.stringify(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(key), raw);
    }
    memory.set(key, { raw, value });
  } catch {
    // Storage full or blocked. This visit still shows `value`.
  }
  notify();
}

export function clearPageCache(key: string) {
  session.delete(key);
  memory.delete(key);
  inflight.delete(key);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(storageKey(key));
    } catch {
      // Ignore a blocked storage write. The next fetch still runs.
    }
  }
  notify();
}

export function subscribePageCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadOnce<T>(
  key: string,
  load: () => Promise<T>,
  persist: (value: T) => boolean,
): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = load()
    .then((value) => {
      rememberPage(key, value, persist(value));
      return value;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, pending);
  return pending;
}

/** User asked to reload. Always hits the shop, then replaces a successful copy. */
export function refreshCached<T>(
  key: string,
  load: () => Promise<T>,
  persist: (value: T) => boolean,
): Promise<T> {
  inflight.delete(key);
  const pending = load()
    .then((value) => {
      rememberPage(key, value, persist(value));
      return value;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error;
    });
  inflight.set(key, pending);
  return pending;
}

/** Return the saved copy when this screen already loaded. Otherwise call `load` once and save it. */
export async function cachedQuery<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = readPageCache<T>(key);
  if (cached !== null && cached !== undefined) return cached;
  const value = await load();
  rememberPage(key, value, true);
  return value;
}
