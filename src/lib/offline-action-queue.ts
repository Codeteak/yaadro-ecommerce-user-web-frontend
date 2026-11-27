/**
 * Phase 5 — lightweight offline intent log.
 * Cart / wishlist already write to localStorage; this queue drives reconnect
 * toasts (“Synced N actions”) after the shopper was offline.
 */

export type OfflineActionKind = "cart" | "wishlist";

export type OfflineAction = {
  id: string;
  kind: OfflineActionKind;
  productId: string;
  label: string;
  at: number;
};

const STORAGE_KEY = "yaadro-offline-actions-v1";
const MAX_ACTIONS = 40;

function readQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is OfflineAction =>
        !!item &&
        typeof item === "object" &&
        typeof (item as OfflineAction).id === "string" &&
        typeof (item as OfflineAction).productId === "string",
    );
  } catch {
    return [];
  }
}

function writeQueue(actions: OfflineAction[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(actions.slice(-MAX_ACTIONS)),
    );
  } catch {
    // private mode / quota
  }
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Record a local cart/wishlist mutation made while offline.
 * Dedupes by kind + productId (latest wins). Returns true if queued.
 */
export function enqueueOfflineAction(input: {
  kind: OfflineActionKind;
  productId: string;
  label: string;
}): boolean {
  if (!isBrowserOffline()) return false;
  const next: OfflineAction = {
    id: `${input.kind}:${input.productId}:${Date.now()}`,
    kind: input.kind,
    productId: input.productId,
    label: input.label,
    at: Date.now(),
  };
  const prev = readQueue().filter(
    (a) => !(a.kind === input.kind && a.productId === input.productId),
  );
  writeQueue([...prev, next]);
  return true;
}

export function peekOfflineActionCount(): number {
  return readQueue().length;
}

/** Clear the queue and return how many intents were waiting. */
export function flushOfflineActionQueue(): number {
  const n = readQueue().length;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return n;
}
