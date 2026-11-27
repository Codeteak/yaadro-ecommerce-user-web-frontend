"use client";

import Link from "next/link";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import {
  DairyPageSkeleton,
  FestivePageSkeleton,
  StorefrontRouteShell,
} from "@/components/ui/skeletons";
import { showPopup } from "@/components/ui/Toast";

/**
 * Playground roundup — what loading/offline work is wired on ecom now.
 */
export function LoadingOfflineShippedDemo() {
  return (
    <DemoFrame
      surface="bare"
      note="Roundup of shipped loading + offline work. Live on ecom; labs linked below."
    >
      <div className="mx-auto max-w-lg space-y-8">
        <section className="space-y-3">
          <h2 className="px-1 text-[15px] font-extrabold text-forest">
            1 · Offline banner F (live)
          </h2>
          <p className="px-1 text-[12px] leading-5 text-muted">
            Amber card · black WifiOff · Try again on the right. On home, dairy,
            festive, profile, cart, wishlist, orders.
          </p>
          <div className="rounded-2xl bg-[#f3f6f3] py-4 ring-1 ring-forest/10">
            <OfflineStatusBanner forcePreview tone="cached" />
            <div className="mt-3">
              <OfflineStatusBanner forcePreview tone="reconnect" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[15px] font-extrabold text-forest">
            2 · Offline-safe toasts (Lucide)
          </h2>
          <p className="px-1 text-[12px] leading-5 text-muted">
            No SVG fetch — icons still show when offline. Tap to fire.
          </p>
          <div className="flex flex-wrap gap-2 px-1">
            {(
              [
                [
                  "error",
                  "Couldn't refresh. Check your connection.",
                  "Offline retry",
                ],
                ["success", "Back online — catalog refreshed", "Success"],
                ["warning", "Slow connection — loading essentials", "Warning"],
                ["info", "Showing the last page we loaded.", "Info"],
              ] as const
            ).map(([tone, message, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => showPopup(message, tone)}
                className="rounded-full bg-track px-3.5 py-2 text-[12px] font-bold text-black shadow-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[15px] font-extrabold text-forest">
            3 · Route shell (not full-page skeleton)
          </h2>
          <p className="px-1 text-[12px] leading-5 text-muted">
            `(storefront)/loading.tsx` → chrome only while the next page streams.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-forest/10">
            <StorefrontRouteShell className="min-h-[14rem]" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[15px] font-extrabold text-forest">
            4 · Section Suspense (dairy / festive)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
              <DairyPageSkeleton className="min-h-0 scale-[0.92] origin-top" />
            </div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
              <FestivePageSkeleton className="min-h-0 scale-[0.92] origin-top" />
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl bg-mint/40 px-4 py-3 ring-1 ring-forest/10">
          <p className="text-[13px] font-extrabold text-forest">Try the labs</p>
          <ul className="space-y-1.5 text-[13px] font-semibold text-forest">
            <li>
              <Link
                href="/playground/low-bandwidth-loading"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Low-bandwidth loading
              </Link>{" "}
              — Phase 3 (chip D live on /home)
            </li>
            <li>
              <Link
                href="/playground/adaptive-media-offline"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Adaptive media + offline
              </Link>{" "}
              — Phase 4 (lite tiles + home snapshot live)
            </li>
            <li>
              <Link
                href="/playground/reconnect-resume"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Reconnect resume
              </Link>{" "}
              — Phase 5 (queue + back-online toast live)
            </li>
            <li>
              <Link
                href="/playground/loading-polish"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Loading polish
              </Link>{" "}
              — Phase 6 (peek / lite banners / weight queue live)
            </li>
            <li>
              <Link
                href="/playground/loading-phases"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Loading phases
              </Link>{" "}
              — Fast / Slow / Offline replay
            </li>
            <li>
              <Link
                href="/playground/offline-status-banner"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Offline banner A–F
              </Link>{" "}
              — compare styles (live = F)
            </li>
            <li>
              <Link
                href="/playground/toasts"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Toasts
              </Link>{" "}
              — full snackbar lab
            </li>
            <li>
              <Link
                href="/playground/skeletons"
                className="underline decoration-leaf/50 underline-offset-2"
              >
                Skeletons
              </Link>{" "}
              — route shell + dairy/festive bones
            </li>
          </ul>
        </section>
      </div>
    </DemoFrame>
  );
}
