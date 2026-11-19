/**
 * Last-known profile UI (name + avatar seed) for instant paint after refresh.
 * Cleared on logout. Not a security token — display only.
 */

export type CachedProfileUi = {
  userId: string;
  displayName: string;
};

export const PROFILE_UI_CACHE_KEY = "yaadro-profile-ui-v1";

export function readCachedProfileUi(): CachedProfileUi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROFILE_UI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedProfileUi>;
    const userId = parsed.userId?.trim();
    const displayName = parsed.displayName?.trim();
    if (!userId || !displayName) return null;
    return { userId, displayName };
  } catch {
    return null;
  }
}

export function writeCachedProfileUi(value: CachedProfileUi): void {
  if (typeof window === "undefined") return;
  const userId = value.userId.trim();
  const displayName = value.displayName.trim();
  if (!userId || !displayName) return;
  try {
    window.sessionStorage.setItem(
      PROFILE_UI_CACHE_KEY,
      JSON.stringify({ userId, displayName }),
    );
  } catch {
    // best-effort
  }
}

export function clearCachedProfileUi(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PROFILE_UI_CACHE_KEY);
  } catch {
    // ignore
  }
}
