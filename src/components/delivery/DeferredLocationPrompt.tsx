"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import {
  formatDeliveryAddressLabel,
  readDeliveryAddress,
  subscribeDeliveryAddress,
} from "@/lib/delivery-address";

const DEFAULT_DELAY_MS = 900;

function readLabel(): string | null {
  const saved = readDeliveryAddress();
  if (!saved) return null;
  return formatDeliveryAddressLabel(saved) || null;
}

type DeferredLocationPromptProps = {
  /** Ms after mount before offering location (default 900). */
  delayMs?: number;
  /**
   * Playground: force open after delay even if an address exists.
   * Omit on storefront — only prompt when Deliver to is empty.
   */
  forcePreview?: boolean;
};

/**
 * #7 — After the page has painted, softly open the address book when no
 * delivery address is saved. Skips if the shopper already chose a place.
 */
export function DeferredLocationPrompt({
  delayMs = DEFAULT_DELAY_MS,
  forcePreview = false,
}: DeferredLocationPromptProps) {
  const [open, setOpen] = useState(false);
  const offered = useRef(false);
  const label = useSyncExternalStore(
    subscribeDeliveryAddress,
    readLabel,
    () => null,
  );

  useEffect(() => {
    if (offered.current) return;
    if (!forcePreview && label) return;

    const run = () => {
      if (offered.current) return;
      if (!forcePreview && readLabel()) return;
      offered.current = true;
      setOpen(true);
    };

    let idleId = 0;
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => run(), { timeout: 400 });
      } else {
        run();
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs, forcePreview, label]);

  return <AddressBookSheet open={open} onOpenChange={setOpen} />;
}
