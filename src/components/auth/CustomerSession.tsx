"use client";

import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import type { ReactNode } from "react";

/** Hearts and the wishlist follow a real OTP session. */
export function CustomerSession({ children }: { children: ReactNode }) {
  const signedIn = useCustomerSignedIn();

  return (
    <WishlistProvider previewSignedIn={signedIn}>{children}</WishlistProvider>
  );
}
