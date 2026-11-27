"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff } from "lucide-react";
import { showPopup } from "@/components/ui/Toast";
import { useOnlineStatus } from "@/lib/use-online-status";
import { cn } from "@/lib/cn";

const COPY = {
  cached: {
    title: "No connection",
    detail: "Showing the last page we loaded.",
  },
  reconnect: {
    title: "No connection",
    detail: "Changes will sync when you're back online.",
  },
} as const;

/**
 * Offline cue — option F: amber warning card, inline icon + copy,
 * Try again on the right (track). Same alert family as cart minimums.
 */
export function OfflineStatusBanner({
  className,
  tone = "cached",
  forcePreview = false,
  onRetry,
}: {
  className?: string;
  tone?: keyof typeof COPY;
  forcePreview?: boolean;
  /** Optional refresh (e.g. home catalog). Defaults to `router.refresh()`. */
  onRetry?: () => void | Promise<void>;
}) {
  const online = useOnlineStatus();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (online && !forcePreview) return null;

  const copy = COPY[tone];

  const handleRetry = async () => {
    if (busy) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showPopup("Couldn't refresh. Check your connection.", "error");
      return;
    }
    setBusy(true);
    try {
      if (onRetry) await onRetry();
      else router.refresh();
    } catch {
      showPopup("Couldn't refresh. Check your connection.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("mx-auto w-full max-w-lg px-5 pt-3", className)}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-amber-400 bg-amber-50 px-3.5 py-3",
          "shadow-[0_6px_18px_rgba(180,83,9,0.1)]",
        )}
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-amber-500 text-black shadow-[0_4px_12px_rgba(180,83,9,0.28)]"
        >
          <WifiOff className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-extrabold tracking-tight text-amber-950">
            {copy.title}
          </p>
          <p className="text-[12px] leading-4 font-medium text-amber-900/75">
            {copy.detail}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={busy}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-track px-3.5 text-[12px] font-bold text-black",
            "shadow-[0_4px_12px_rgba(47,107,47,0.25)] transition",
            "hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
            "disabled:opacity-60",
          )}
        >
          <RefreshCw
            className={cn("size-3.5", busy && "animate-spin")}
            strokeWidth={2.5}
            aria-hidden
          />
          Try again
        </button>
      </div>
    </div>
  );
}
