/**
 * Playground access is gated by `src/middleware.ts` (404 in production).
 * Kept as a named helper so pages can document the intent if needed later.
 */
export function isPlaygroundDevOnly() {
  return process.env.NODE_ENV !== "production";
}
