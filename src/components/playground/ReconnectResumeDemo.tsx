"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Plus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { DemoFrame } from "@/components/playground/DemoFrame";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { showPopup } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

type Net = "online" | "offline" | "reconnecting";

type QueuedAction = {
  id: string;
  kind: "cart" | "wishlist";
  productName: string;
  status: "pending" | "syncing" | "done" | "failed";
};

const DEMO_PRODUCTS = SAMPLE_PRODUCTS.slice(0, 3);

/**
 * Phase 5 lab — mirrors live ReconnectResumeListener + offline-action-queue.
 */
export function ReconnectResumeDemo() {
  const [net, setNet] = useState<Net>("online");
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [refreshed, setRefreshed] = useState(false);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const goOffline = () => {
    clearTimers();
    setNet("offline");
    setRefreshed(false);
    showPopup("You're offline — actions will sync later.", "warning");
  };

  const enqueue = (kind: QueuedAction["kind"], productName: string) => {
    if (net === "online") {
      showPopup(
        kind === "cart"
          ? `Added ${productName} to basket`
          : `Saved ${productName} to wishlist`,
        "success",
      );
      return;
    }
    if (net === "reconnecting") return;

    nextId.current += 1;
    const id = `${kind}-${productName}-${nextId.current}`;
    setQueue((prev) => [
      ...prev,
      { id, kind, productName, status: "pending" },
    ]);
    showPopup(
      kind === "cart"
        ? `Queued: add ${productName}`
        : `Queued: save ${productName}`,
      "info",
    );
  };

  const goOnline = () => {
    if (net === "reconnecting") return;
    clearTimers();
    setRefreshed(false);

    if (queue.length === 0 || queue.every((a) => a.status === "done")) {
      setNet("online");
      setQueue([]);
      showPopup("Back online", "success");
      const t = window.setTimeout(() => setRefreshed(true), 400);
      timers.current.push(t);
      return;
    }

    setNet("reconnecting");
    showPopup("Back online — syncing…", "info");

    const pending = queue.filter((a) => a.status === "pending");
    let delay = 350;

    pending.forEach((action, index) => {
      const syncId = window.setTimeout(() => {
        setQueue((prev) =>
          prev.map((a) =>
            a.id === action.id ? { ...a, status: "syncing" } : a,
          ),
        );
      }, delay);
      timers.current.push(syncId);

      const doneId = window.setTimeout(() => {
        setQueue((prev) =>
          prev.map((a) =>
            a.id === action.id ? { ...a, status: "done" } : a,
          ),
        );
      }, delay + 450);
      timers.current.push(doneId);

      delay += 700;

      if (index === pending.length - 1) {
        const finishId = window.setTimeout(() => {
          setNet("online");
          showPopup(
            `Synced ${pending.length} action${pending.length === 1 ? "" : "s"}`,
            "success",
          );
          setRefreshed(true);
          const clearId = window.setTimeout(() => setQueue([]), 1600);
          timers.current.push(clearId);
        }, delay + 200);
        timers.current.push(finishId);
      }
    });
  };

  const reset = () => {
    clearTimers();
    setNet("online");
    setQueue([]);
    setRefreshed(false);
  };

  const pendingCount = queue.filter((a) => a.status === "pending").length;

  return (
    <DemoFrame
      surface="bare"
      note="Phase 5 wired: AppProviders ReconnectResumeListener + offline queue. Lab mirrors live flush / toast / catalog refresh."
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div
          className="grid grid-cols-3 gap-1 rounded-full bg-paper p-1 ring-1 ring-forest/10"
          role="tablist"
          aria-label="Network"
        >
          {(
            [
              ["online", "Online", Wifi],
              ["offline", "Offline", WifiOff],
              ["reconnecting", "Sync", RefreshCw],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={net === id}
              disabled={id === "reconnecting"}
              onClick={() => {
                if (id === "online") goOnline();
                else if (id === "offline") goOffline();
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-full px-2 py-2 text-[11px] font-bold transition",
                net === id
                  ? "bg-track text-black shadow-sm"
                  : "text-forest/70 hover:text-forest disabled:opacity-40",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5",
                  net === "reconnecting" && id === "reconnecting" && "animate-spin",
                )}
                strokeWidth={2.4}
                aria-hidden
              />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-mint/35 px-3 py-2 ring-1 ring-forest/10">
          <p className="text-[12px] font-semibold text-forest">
            {net === "online"
              ? refreshed
                ? "Online · catalog refreshed"
                : "Online · actions apply now"
              : net === "offline"
                ? `Offline · ${pendingCount} queued`
                : "Reconnecting · flushing queue"}
          </p>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-forest ring-1 ring-forest/15"
          >
            Reset
          </button>
        </div>

        <div className="relative h-[min(72vh,36rem)] overflow-hidden rounded-[1.75rem] bg-paper ring-1 ring-black/10 shadow-[0_16px_40px_rgba(47,107,47,0.12)]">
          <div className="h-full overflow-y-auto overscroll-contain pb-8">
            {net !== "online" ? (
              <OfflineStatusBanner
                forcePreview
                tone={net === "reconnecting" ? "reconnect" : "cached"}
                className="pt-3"
              />
            ) : null}

            <section className="px-4 pt-4">
              <h2 className="text-[15px] font-extrabold text-forest">
                Try actions
              </h2>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                Offline: taps queue. Online: apply immediately. Hit Online to
                flush.
              </p>

              <ul className="mt-3 space-y-2">
                {DEMO_PRODUCTS.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-forest/10"
                  >
                    <div
                      aria-hidden
                      className="grid size-12 shrink-0 place-items-center rounded-xl bg-mint text-[13px] font-black text-forest"
                    >
                      {product.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink">
                        {product.name}
                      </p>
                      <p className="text-[11px] font-semibold text-muted">
                        ₹{product.price}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Wishlist ${product.name}`}
                      disabled={net === "reconnecting"}
                      onClick={() => enqueue("wishlist", product.name)}
                      className="grid size-9 place-items-center rounded-full bg-white text-forest ring-1 ring-forest/15 disabled:opacity-40"
                    >
                      <Heart className="size-4" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Add ${product.name}`}
                      disabled={net === "reconnecting"}
                      onClick={() => enqueue("cart", product.name)}
                      className="grid size-9 place-items-center rounded-full bg-track text-black disabled:opacity-40"
                    >
                      <Plus className="size-4" strokeWidth={2.6} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-5 px-4">
              <h3 className="text-[12px] font-bold tracking-wide text-muted uppercase">
                Sync queue
              </h3>
              {queue.length === 0 ? (
                <p className="mt-2 rounded-xl bg-mint/30 px-3 py-3 text-[12px] font-medium text-muted">
                  Empty — go offline and tap + / ♥
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {queue.map((action) => (
                    <li
                      key={action.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold ring-1",
                        action.status === "done"
                          ? "bg-mint/50 text-forest ring-leaf/30"
                          : action.status === "syncing"
                            ? "bg-amber-50 text-amber-950 ring-amber-300"
                            : "bg-white text-ink ring-forest/10",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {action.kind === "cart" ? "Cart" : "Wishlist"} ·{" "}
                        {action.productName}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold tracking-wide uppercase">
                        {action.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {refreshed && net === "online" ? (
              <p className="mt-5 px-4 text-center text-[11px] font-semibold text-leaf">
                Catalog refresh fired after sync
              </p>
            ) : null}
          </div>
        </div>

        <ol className="space-y-1.5 rounded-2xl bg-paper px-4 py-3 text-[11px] leading-4 text-muted ring-1 ring-forest/10">
          <li>
            <span className="font-bold text-forest">1.</span> Offline taps enqueue
            (local cart/wishlist already persist — this covers failed API sync).
          </li>
          <li>
            <span className="font-bold text-forest">2.</span> Rising{" "}
            <code className="rounded bg-mint/50 px-1">online</code> edge → flush
            queue → success toast.
          </li>
          <li>
            <span className="font-bold text-forest">3.</span> Then{" "}
            <code className="rounded bg-mint/50 px-1">refreshStorefrontCatalog</code>
            .
          </li>
          <li>
            <span className="font-bold text-forest">Live:</span>{" "}
            <code className="rounded bg-mint/50 px-1">ReconnectResumeListener</code>{" "}
            + sessionStorage queue.
          </li>
        </ol>
      </div>
    </DemoFrame>
  );
}
