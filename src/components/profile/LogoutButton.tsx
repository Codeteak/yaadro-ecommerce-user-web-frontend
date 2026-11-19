"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { clearCustomerSession, logoutCustomer } from "@/lib/api/auth";

const LOGOUT_TIMEOUT_MS = 8000;

export function LogoutButton() {
  const router = useRouter();

  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (pending) return;
        setPending(true);
        void (async () => {
          try {
            await Promise.race([
              logoutCustomer(),
              new Promise<void>((resolve) => {
                window.setTimeout(resolve, LOGOUT_TIMEOUT_MS);
              }),
            ]);
          } finally {
            // If the logout API hung past the race timeout, still clear locally.
            clearCustomerSession();
            try {
              // Drop a cached LoginForm "welcome" step if /login was soft-cached.
              window.sessionStorage.setItem("yaadro.login.reset", "1");
            } catch {
              // ignore
            }
            setPending(false);
            router.replace("/login");
            router.refresh();
          }
        })();
      }}
      className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut aria-hidden className="size-5 text-red-500" strokeWidth={1.9} />
      <span className="flex-1 text-[15px] font-medium text-red-600">
        {pending ? "Signing out…" : "Log out"}
      </span>
    </button>
  );
}
