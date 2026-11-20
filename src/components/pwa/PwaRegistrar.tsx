"use client";

import { useEffect } from "react";

/** Registers `/sw.js` when service workers are available. */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // install is best-effort
    });
  }, []);
  return null;
}
