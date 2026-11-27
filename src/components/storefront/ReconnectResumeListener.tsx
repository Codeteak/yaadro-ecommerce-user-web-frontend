"use client";

import { useEffect, useRef } from "react";
import { showPopup } from "@/components/ui/Toast";
import { refreshStorefrontCatalog } from "@/lib/api/refresh-catalog";
import { flushOfflineActionQueue } from "@/lib/offline-action-queue";
import { syncServerDeliveryAddress } from "@/lib/sync-server-address";

/**
 * Phase 5 — rising `online` edge after offline:
 * flush intent queue → toast → refresh catalog (+ address sync).
 * Mount once from AppProviders.
 */
export function ReconnectResumeListener() {
  const seenOffline = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    seenOffline.current = !navigator.onLine;

    const onOffline = () => {
      seenOffline.current = true;
      showPopup("You're offline — basket & wishlist still work.", "warning");
    };

    const onOnline = () => {
      if (!seenOffline.current) return;
      seenOffline.current = false;

      const synced = flushOfflineActionQueue();
      if (synced > 0) {
        showPopup(
          `Synced ${synced} action${synced === 1 ? "" : "s"}`,
          "success",
        );
      } else {
        showPopup("Back online", "success");
      }

      void refreshStorefrontCatalog().catch(() => {
        // Best-effort; banner / pull-to-refresh still available.
      });
      void syncServerDeliveryAddress().catch(() => {
        // Guest / unsigned — ignore.
      });
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
