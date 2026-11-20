/**
 * Customer session.
 *
 * Access token stays in memory. Refresh token stays in localStorage so the
 * shopper stays signed in across tabs/reloads (~backend refresh lifetime;
 * client clock uses NEXT_PUBLIC_AUTH_REFRESH_TOKEN_DAYS, default 50).
 */

import { clearCachedProfileUi } from "@/lib/profile-cache";

export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
};

const REFRESH_KEY = "yaadro.customer.refreshToken";
const EPOCH_KEY = "yaadro.customer.sessionEpoch";
const LEGACY_ACCESS_KEY = "yaadro.customer.accessToken";
const SESSION_EVENT = "yaadro-customer-session";
const EXPIRY_KEY = "yaadro.customer.sessionExpiresAt";

let accessToken: string | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function refreshTokenDays(): number {
  const raw = Number(
    process.env.NEXT_PUBLIC_AUTH_REFRESH_TOKEN_DAYS ??
      process.env.NEXT_PUBLIC_AUTH_SESSION_DAYS,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 50;
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
  for (const listener of listeners) listener();
}

function readRefresh(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const expiresAt = Number(window.localStorage.getItem(EXPIRY_KEY));
    if (Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() > expiresAt) {
      window.localStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(EXPIRY_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      return null;
    }
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function migrateLegacyTokens() {
  if (typeof window === "undefined") return;
  try {
    // Old build kept refresh in sessionStorage — lift into localStorage once.
    const sessionRefresh = window.sessionStorage.getItem(REFRESH_KEY);
    if (sessionRefresh && !window.localStorage.getItem(REFRESH_KEY)) {
      window.localStorage.setItem(REFRESH_KEY, sessionRefresh);
      const days = refreshTokenDays();
      window.localStorage.setItem(
        EXPIRY_KEY,
        String(Date.now() + days * 24 * 60 * 60 * 1000),
      );
    }
    window.sessionStorage.removeItem(REFRESH_KEY);
    const legacyAccess = window.localStorage.getItem(LEGACY_ACCESS_KEY);
    if (legacyAccess && !accessToken) accessToken = legacyAccess;
    if (legacyAccess) {
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
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
        window.localStorage.removeItem(REFRESH_KEY);
        window.localStorage.removeItem(EXPIRY_KEY);
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
      window.localStorage.setItem(REFRESH_KEY, session.refreshToken);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.sessionStorage.removeItem(REFRESH_KEY);
      const days = refreshTokenDays();
      window.localStorage.setItem(
        EXPIRY_KEY,
        String(Date.now() + days * 24 * 60 * 60 * 1000),
      );
      window.localStorage.setItem(EPOCH_KEY, String(Date.now()));
    } catch {
      // memory token still works until reload
    }
  }
  notify();
}

export function clearCustomerSession() {
  accessToken = null;
  clearCachedProfileUi();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
      window.localStorage.removeItem(EXPIRY_KEY);
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
    if (
      event.key === EPOCH_KEY ||
      event.key === REFRESH_KEY ||
      event.key === EXPIRY_KEY ||
      event.key === null
    ) {
      if (event.key === EPOCH_KEY && event.newValue == null) {
        accessToken = null;
      }
      if (event.key === REFRESH_KEY && event.newValue == null) {
        accessToken = null;
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
