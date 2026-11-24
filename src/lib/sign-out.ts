/**
 * Per-user data cleanup on sign out.
 * Each step is injected so one failing store never leaves the rest behind.
 */

export type SignOutCleanupDeps = {
  clearSession: () => void;
  clearQueryCache: () => void;
  clearCouponPromo: () => void;
  clearSavedAddresses: () => void;
  clearDeliveryAddress: () => void;
  clearProfileCache: () => void;
  markLoginReset: () => void;
};

export type SignOutCleanupResult = {
  failed: (keyof SignOutCleanupDeps)[];
};

const STEP_ORDER: (keyof SignOutCleanupDeps)[] = [
  "clearSession",
  "clearQueryCache",
  "clearCouponPromo",
  "clearSavedAddresses",
  "clearDeliveryAddress",
  "clearProfileCache",
  "markLoginReset",
];

/**
 * Wipe everything tied to the signed-in shopper. The guest basket and
 * wishlist stay — they belong to the device, not the account.
 */
export function clearSignedInUserData(
  deps: SignOutCleanupDeps,
): SignOutCleanupResult {
  const failed: (keyof SignOutCleanupDeps)[] = [];
  for (const step of STEP_ORDER) {
    try {
      deps[step]();
    } catch {
      failed.push(step);
    }
  }
  return { failed };
}
