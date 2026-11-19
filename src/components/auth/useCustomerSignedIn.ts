"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ensureCustomerSessionRestored } from "@/lib/api/client";
import {
  hasCustomerSession,
  subscribeCustomerSession,
} from "@/lib/api/session";

export type CustomerAuthStatus = "loading" | "guest" | "signed-in";

/**
 * OTP session lifecycle for UI.
 * `loading` — SSR / hydration / access-token restore still running.
 * Avoid treating that as guest (profile was flashing Guest → Customer).
 */
export function useCustomerAuthStatus(): CustomerAuthStatus {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void ensureCustomerSessionRestored().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getSnapshot = useCallback(
    () => (ready ? hasCustomerSession() : false),
    [ready],
  );

  const signedIn = useSyncExternalStore(
    subscribeCustomerSession,
    getSnapshot,
    () => false,
  );

  if (!ready) return "loading";
  return signedIn ? "signed-in" : "guest";
}

/**
 * OTP session for UI. Stays `false` through SSR + hydration + restore,
 * then follows the real session. Prefer `useCustomerAuthStatus` when the
 * loading state must not look like a guest.
 */
export function useCustomerSignedIn(): boolean {
  return useCustomerAuthStatus() === "signed-in";
}
