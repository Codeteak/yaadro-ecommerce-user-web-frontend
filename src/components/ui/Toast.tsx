"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { cn } from "@/lib/cn";

export type PopupType = "success" | "error" | "info" | "warning";

/** Alias for playground / docs that still say “tone”. */
export type ToastTone = PopupType;

type ToastItem = {
  id: number;
  type: PopupType;
  message: string;
};

type PopupState = {
  items: ToastItem[];
  show: (message: string, type: PopupType) => void;
  dismiss: (id: number) => void;
};

const DISMISS_MS = 3200;
const MAX_VISIBLE = 3;

const TOAST_ICON: Record<PopupType, string> = {
  success: "/toasts/success.svg",
  error: "/toasts/error.svg",
  info: "/toasts/info.svg",
  warning: "/toasts/warning.svg",
};

let nextId = 1;

export const usePopup = create<PopupState>((set) => ({
  items: [],
  show: (message, type) => {
    const id = nextId++;
    set((state) => {
      const next = [...state.items, { id, type, message }];
      return {
        items:
          next.length > MAX_VISIBLE
            ? next.slice(next.length - MAX_VISIBLE)
            : next,
      };
    });
    window.setTimeout(() => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    }, DISMISS_MS);
  },
  dismiss: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));

/**
 * Theme island snackbar API used across the storefront.
 * Keeps the other developer’s `showPopup(message, type)` call sites.
 */
export function showPopup(message: string, type: PopupType) {
  usePopup.getState().show(message, type);
}

/** Mount once (AppProviders). Portals islands to document.body at the top. */
export function ToastViewport() {
  const items = usePopup((state) => state.items);
  const dismiss = usePopup((state) => state.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))] z-[110] flex flex-col items-center gap-2.5 px-4"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((item) => (
        <ToastIsland key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastIsland({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex max-w-[min(92vw,22rem)] items-center gap-2.5 rounded-full py-2 pr-2 pl-2.5",
        "bg-[#1a2e1a]/92 text-white shadow-[0_12px_40px_rgba(20,40,20,0.45)] ring-1 ring-white/12 backdrop-blur-md",
        "animate-[toast-island-in_280ms_ease-out]",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          item.type === "success" && "bg-leaf",
          item.type === "error" && "bg-red-500",
          item.type === "warning" && "bg-amber-500",
          item.type === "info" && "bg-forest",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TOAST_ICON[item.type]}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px]"
          draggable={false}
        />
      </span>
      <p className="min-w-0 flex-1 py-1 text-[13px] leading-snug font-semibold text-white">
        {item.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
