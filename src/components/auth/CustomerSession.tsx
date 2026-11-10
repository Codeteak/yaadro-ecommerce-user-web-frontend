"use client";

import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import {
  hasCustomerSession,
  subscribeCustomerSession,
} from "@/lib/api/auth";
import { useSyncExternalStore, type ReactNode } from "react";

/** Hearts and the wishlist follow a real OTP session. */
export function CustomerSession({ children }: { children: ReactNode }) {
  const signedIn = useSyncExternalStore(
    subscribeCustomerSession,
    hasCustomerSession,
    () => false,
  );

  return <WishlistProvider previewSignedIn={signedIn}>{children}</WishlistProvider>;
}
