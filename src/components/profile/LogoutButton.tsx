"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LogOut } from "lucide-react";
import { clearCustomerSession, logoutCustomer } from "@/lib/api/auth";
import { showPopup } from "@/components/ui/Toast";

const LOGOUT_TIMEOUT_MS = 8000;

type LogoutButtonProps = {
  /** Ask before signing out (live `/profile` default via ProfileAccountNav). */
  confirmBeforeLogout?: boolean;
  /**
   * Playground: after confirm, toast only — no API / session clear / navigate.
   */
  dryRun?: boolean;
};

export function LogoutButton({
  confirmBeforeLogout = false,
  dryRun = false,
}: LogoutButtonProps = {}) {
  const router = useRouter();
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runLogout = () => {
    if (pending) return;
    if (dryRun) {
      setConfirmOpen(false);
      showPopup("Sign out confirmed (playground — not wired).", "info");
      return;
    }
    setPending(true);
    setConfirmOpen(false);
    void (async () => {
      try {
        await Promise.race([
          logoutCustomer(),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, LOGOUT_TIMEOUT_MS);
          }),
        ]);
      } finally {
        clearCustomerSession();
        try {
          window.sessionStorage.setItem("yaadro.login.reset", "1");
        } catch {
          // ignore
        }
        setPending(false);
        router.replace("/login");
        router.refresh();
      }
    })();
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (pending) return;
          if (confirmBeforeLogout) {
            setConfirmOpen(true);
            return;
          }
          runLogout();
        }}
        className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut aria-hidden className="size-5 text-red-500" strokeWidth={1.9} />
        <span className="flex-1 text-[15px] font-medium text-red-600">
          {pending ? "Signing out…" : "Log out"}
        </span>
      </button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-track/45 backdrop-blur-[2px]"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative mx-4 mb-[max(1.25rem,env(safe-area-inset-bottom))] w-full max-w-sm rounded-[1.5rem] bg-paper p-5 shadow-[0_24px_48px_rgba(47,107,47,0.28)]">
            <h2 id={titleId} className="text-lg font-extrabold text-black">
              Log out?
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-muted">
              You’ll need to sign in again to sync orders, coupons, and wishlist.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-11 flex-1 rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-forest/15 transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={runLogout}
                className="h-11 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
