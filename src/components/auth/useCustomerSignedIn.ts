"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ensureCustomerSessionRestored } from "@/lib/api/client";
import {
  hasCustomerSession,
  subscribeCustomerSession,
} from "@/lib/api/session";

/**
 * OTP session for UI. Stays `false` through SSR + hydration, then waits
 * until access-token restore finishes so auth GETs are not sent bare
 * (refresh token in sessionStorage alone would look signed-in and 401).
 */
export function useCustomerSignedIn(): boolean {
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

  return useSyncExternalStore(
    subscribeCustomerSession,
    getSnapshot,
    () => false,
  );
}
