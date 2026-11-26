"use client";

import { ProfileOptionsList } from "@/components/profile/ProfileOptionsList";

/**
 * Playground mirror of live `/profile` More list (guest + signed-in).
 * Source of truth: ProfileOptionsList / ProfileOptionRow.
 */
export function ProfileOptionsRefineDemo() {
  return (
    <div className="space-y-10 bg-paper px-5 py-4 pb-10">
      <div className="rounded-2xl bg-mint/50 px-3.5 py-3 text-[13px] leading-5 text-forest ring-1 ring-leaf/25">
        <p className="font-bold">Wired to ecom `/profile`</p>
        <p className="mt-1 text-forest/90">
          Same <code className="font-mono text-[12px]">ProfileOptionsList</code>{" "}
          as live profile. Guest Order history / Coupons: gray Sign in pill +
          “Sign in to see…” copy; brand icons on mint tiles.
        </p>
      </div>

      <section>
        <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
          Guest
        </p>
        <div className="mt-2">
          <ProfileOptionsList signedIn={false} hideAddressRow />
        </div>
      </section>

      <section>
        <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
          Signed in
        </p>
        <div className="mt-2">
          <ProfileOptionsList signedIn hideAddressRow />
        </div>
      </section>
    </div>
  );
}
