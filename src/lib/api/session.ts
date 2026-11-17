/**
 * Customer session.
 *
 * The shop API returns tokens in JSON. A browser script cannot set an httpOnly
 * cookie, so the access token stays in memory and the refresh token stays in
 * sessionStorage (this tab only, cleared when the tab session ends).
 * localStorage is used only for a non-secret epoch so other tabs hear logout.
 */

export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
};

const REFRESH_KEY = "yaadro.customer.refreshToken";
const EPOCH_KEY = "yaadro.customer.sessionEpoch";
const LEGACY_ACCESS_KEY = "yaadro.customer.accessToken";
const SESSION_EVENT = "yaadro-customer-session";

let accessToken: string | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
  for (const listener of listeners) listener();
}

function readRefresh(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function migrateLegacyTokens() {
  if (typeof window === "undefined") return;
  try {
    const legacyRefresh = window.localStorage.getItem(REFRESH_KEY);
    const legacyAccess = window.localStorage.getItem(LEGACY_ACCESS_KEY);
    if (legacyRefresh && !readRefresh()) {
      window.sessionStorage.setItem(REFRESH_KEY, legacyRefresh);
    }
    if (legacyAccess && !accessToken) accessToken = legacyAccess;
    if (legacyRefresh || legacyAccess) {
      window.localStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.setItem(EPOCH_KEY, String(Date.now()));
    }
  } catch {
    // storage may be blocked; the shopper can sign in again
  }
}

migrateLegacyTokens();

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel("yaadro-customer-session");
  channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === "logout") {
      accessToken = null;
      try {
        window.sessionStorage.removeItem(REFRESH_KEY);
      } catch {
        // ignore
      }
      notify();
    }
  };
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return readRefresh();
}

export function saveCustomerSession(session: CustomerSession) {
  accessToken = session.accessToken;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(REFRESH_KEY, session.refreshToken);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
      window.localStorage.setItem(EPOCH_KEY, String(Date.now()));
    } catch {
      // memory token still works until reload
    }
  }
  notify();
}

export function clearCustomerSession() {
  accessToken = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(EPOCH_KEY);
    } catch {
      // ignore
    }
    channel?.postMessage({ type: "logout" });
  }
  notify();
}

export function hasCustomerSession(): boolean {
  return Boolean(accessToken || readRefresh());
}

export function subscribeCustomerSession(onChange: () => void) {
  listeners.add(onChange);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onChange);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === EPOCH_KEY || event.key === null) {
      if (event.key === EPOCH_KEY && event.newValue == null) {
        accessToken = null;
        try {
          window.sessionStorage.removeItem(REFRESH_KEY);
        } catch {
          // ignore
        }
      }
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}

let onExpired: ((returnTo: string) => void) | null = null;

export function setSessionExpiredHandler(handler: ((returnTo: string) => void) | null) {
  onExpired = handler;
}

export function notifySessionExpired() {
  const returnTo =
    typeof window === "undefined"
      ? "/home"
      : `${window.location.pathname}${window.location.search}`;
  clearCustomerSession();
  onExpired?.(returnTo);
}
