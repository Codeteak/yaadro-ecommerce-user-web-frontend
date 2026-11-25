/**
 * Last-known profile UI (name + phone + avatar seed) for instant paint after refresh.
 * Cleared on logout. Not a security token — display only.
 *
 * Read via `useSyncExternalStore` + `getServerSnapshot: () => null` so SSR
 * and hydration never diverge (sessionStorage is client-only).
 * `getSnapshot` must return a cached reference when data is unchanged.
 */

export type CachedProfileUi = {
  userId: string;
  displayName: string;
  /** Display-only mobile; avoids “Add mobile number” flash before API returns. */
  phone?: string | null;
};

export const PROFILE_UI_CACHE_KEY = "yaadro-profile-ui-v1";
export const PROFILE_UI_CACHE_EVENT = "yaadro-profile-ui";

/** Stable snapshot for useSyncExternalStore (Object.is must not churn). */
let snapshot: CachedProfileUi | null = null;
let snapshotRaw: string | null = null;
let snapshotHydrated = false;

function notifyProfileCache() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILE_UI_CACHE_EVENT));
}

export function subscribeCachedProfileUi(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onEvent = () => onStoreChange();
  window.addEventListener(PROFILE_UI_CACHE_EVENT, onEvent);
  window.addEventListener("storage", onEvent);
  return () => {
    window.removeEventListener(PROFILE_UI_CACHE_EVENT, onEvent);
    window.removeEventListener("storage", onEvent);
  };
}

function parseCached(raw: string | null): CachedProfileUi | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedProfileUi>;
    const userId = parsed.userId?.trim();
    const displayName = parsed.displayName?.trim();
    if (!userId || !displayName) return null;
    const phone =
      typeof parsed.phone === "string" ? parsed.phone.trim() || null : null;
    return { userId, displayName, phone };
  } catch {
    return null;
  }
}

/**
 * Client getSnapshot — same object reference while sessionStorage is unchanged.
 * Required by useSyncExternalStore to avoid infinite re-renders.
 */
export function readCachedProfileUi(): CachedProfileUi | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(PROFILE_UI_CACHE_KEY);
  } catch {
    return null;
  }
  if (snapshotHydrated && raw === snapshotRaw) {
    return snapshot;
  }
  snapshotHydrated = true;
  snapshotRaw = raw;
  snapshot = parseCached(raw);
  return snapshot;
}

/** Server / hydration snapshot — always null (no sessionStorage on SSR). */
export function getCachedProfileUiServerSnapshot(): null {
  return null;
}

export function writeCachedProfileUi(value: CachedProfileUi): void {
  if (typeof window === "undefined") return;
  const userId = value.userId.trim();
  const displayName = value.displayName.trim();
  if (!userId || !displayName) return;
  // Preserve phone when a name-only write omits it (same user).
  const phone =
    value.phone !== undefined
      ? value.phone?.trim() || null
      : snapshot?.userId === userId
        ? (snapshot.phone ?? null)
        : null;
  const next: CachedProfileUi = { userId, displayName, phone };
  const raw = JSON.stringify(next);
  // Same payload — keep the cached reference and skip notify (avoids churn).
  if (snapshotHydrated && raw === snapshotRaw) return;
  try {
    window.sessionStorage.setItem(PROFILE_UI_CACHE_KEY, raw);
    snapshotHydrated = true;
    snapshotRaw = raw;
    snapshot = next;
    notifyProfileCache();
  } catch {
    // best-effort
  }
}

export function clearCachedProfileUi(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PROFILE_UI_CACHE_KEY);
    snapshotHydrated = true;
    snapshotRaw = null;
    snapshot = null;
    notifyProfileCache();
  } catch {
    // ignore
  }
}
