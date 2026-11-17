"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { logoutCustomer } from "@/lib/api/auth";

export function LogoutButton() {
  const router = useRouter();

  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void logoutCustomer().finally(() => {
          router.push("/login");
        });
      }}
      className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition hover:ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-60"
    >
      <LogOut aria-hidden className="size-5 text-red-500" strokeWidth={1.9} />
      <span className="flex-1 text-[15px] font-medium text-red-600">Log out</span>
    </button>
  );
}
