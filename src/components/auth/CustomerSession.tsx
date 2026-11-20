"use client";

import { useEffect, type ReactNode } from "react";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { syncServerDeliveryAddress } from "@/lib/sync-server-address";

/** Hearts, wishlist, and Deliver-to follow a real OTP session. */
export function CustomerSession({ children }: { children: ReactNode }) {
  const signedIn = useCustomerSignedIn();

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void syncServerDeliveryAddress(controller.signal);
    return () => controller.abort();
  }, [signedIn]);

  return (
    <WishlistProvider previewSignedIn={signedIn}>{children}</WishlistProvider>
  );
}
