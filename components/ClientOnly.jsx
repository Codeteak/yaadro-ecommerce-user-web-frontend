'use client';

import { useSyncExternalStore } from 'react';

/** Client snapshot is always true after hydration; server snapshot is false. */
function subscribe() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * Renders children only on the client.
 * Uses useSyncExternalStore so the first client paint already includes children
 * (avoids useEffect-delayed mount that remounts the entire provider tree).
 */
export default function ClientOnly({ children, fallback = null }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  if (!mounted) return fallback;
  return children;
}
