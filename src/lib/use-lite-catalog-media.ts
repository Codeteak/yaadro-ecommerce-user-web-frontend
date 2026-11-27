"use client";

import { useSyncExternalStore } from "react";
import {
  getNetworkConnection,
  shouldUseLiteCatalogMedia,
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

function getSnapshot() {
  return shouldUseLiteCatalogMedia();
}

/** SSR assumes full photos so markup matches first paint on unknown networks. */
function getServerSnapshot() {
  return false;
}

/** True when Save-Data / 2g — ProductCard skips CatalogImage. */
export function useLiteCatalogMedia(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
