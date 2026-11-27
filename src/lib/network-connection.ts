/**
 * Network Information API helpers (Chromium / Android).
 * Safari often omits `navigator.connection` — callers must treat that as “unknown / fast”.
 */

export type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export type ConnectionChipKind = "slow" | "saver";

export function getNetworkConnection(): NetworkConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (
    navigator as Navigator & { connection?: NetworkConnection }
  ).connection;
}

/** Matches PrefetchStorefrontRoute: skip warm routes on offline / save-data / 2g. */
export function shouldSkipPrefetchOnSlowNetwork(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!navigator.onLine) return true;
  const connection = getNetworkConnection();
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = connection.effectiveType;
  return type === "slow-2g" || type === "2g";
}

/**
 * Chip for home / low-bandwidth UI.
 * saveData → saver; 3g / 2g / slow-2g → slow; else null.
 * Offline is handled by OfflineStatusBanner, not this chip.
 */
export function getConnectionChipKind(
  connection: NetworkConnection | undefined = getNetworkConnection(),
): ConnectionChipKind | null {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (!connection) return null;
  if (connection.saveData) return "saver";
  const type = connection.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return "slow";
  return null;
}

/**
 * Phase 4: skip catalog photo bytes on Save-Data / 2g (not 3g).
 * Offline keeps already-painted / SW-cached photos — snapshot strips pass forceLite.
 */
export function shouldUseLiteCatalogMedia(
  connection: NetworkConnection | undefined = getNetworkConnection(),
): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = connection.effectiveType;
  return type === "slow-2g" || type === "2g";
}
