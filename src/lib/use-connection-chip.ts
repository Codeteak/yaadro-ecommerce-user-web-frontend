"use client";

import { useSyncExternalStore } from "react";
import {
  getConnectionChipKind,
  getNetworkConnection,
  type ConnectionChipKind,
} from "@/lib/network-connection";

function subscribe(onChange: () => void) {
  const connection = getNetworkConnection();
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  connection?.addEventListener?.("change", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    connection?.removeEventListener?.("change", onChange);
  };
}

function getSnapshot(): ConnectionChipKind | null {
  return getConnectionChipKind();
}

/** SSR / first paint: no chip (avoids hydration mismatch). */
function getServerSnapshot(): ConnectionChipKind | null {
  return null;
}

/** Live Slow / Data saver chip kind from Network Information API. */
export function useConnectionChipKind(): ConnectionChipKind | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
