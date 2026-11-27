"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearCustomerSession, logoutCustomer } from "@/lib/api/auth";
import { clearCartPromo } from "@/lib/cart-store";
import { clearDeliveryAddress } from "@/lib/delivery-address";
import { clearCachedProfileUi } from "@/lib/profile-cache";
import { clearSavedAddresses } from "@/lib/saved-addresses";
import { clearSignedInUserData } from "@/lib/sign-out";
import { showPopup } from "@/components/ui/Toast";

const LOGOUT_TIMEOUT_MS = 8000;
const LOGIN_RESET_KEY = "yaadro.login.reset";

/**
 * Sign out: tell the shop (bounded wait), then always wipe per-user data
 * locally so the next shopper on this phone sees nothing from this account.
 * After clear → `/home` (guest home), not `/login`.
 */
export function useSignOut({ dryRun = false }: { dryRun?: boolean } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    if (pending) return;
    if (dryRun) {
      showPopup("Sign out confirmed (playground — not wired).", "info");
      return;
    }
    setPending(true);
    try {
      await Promise.race([
        logoutCustomer().catch(() => undefined),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, LOGOUT_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearSignedInUserData({
        clearSession: clearCustomerSession,
        clearQueryCache: () => queryClient.clear(),
        clearCouponPromo: clearCartPromo,
        clearSavedAddresses,
        clearDeliveryAddress,
        clearProfileCache: clearCachedProfileUi,
        markLoginReset: () => window.sessionStorage.setItem(LOGIN_RESET_KEY, "1"),
      });
      setPending(false);
      router.replace("/home");
      router.refresh();
    }
  }, [dryRun, pending, queryClient, router]);

  return { signOut, pending };
}
