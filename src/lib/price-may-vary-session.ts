const KEY = "yaadro_price_may_vary_seen";

/** Show the explain sheet at most once per browser tab session. */
export function hasSeenPriceMayVary(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markPriceMayVarySeen(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // best-effort
  }
}
