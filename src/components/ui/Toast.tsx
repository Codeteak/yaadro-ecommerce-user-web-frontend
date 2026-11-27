"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import {
  AlertTriangle,
  Check,
  Info,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type PopupType = "success" | "error" | "info" | "warning";

/** Alias for playground / docs that still say “tone”. */
export type ToastTone = PopupType;

type ToastItem = {
  id: number;
  type: PopupType;
  message: string;
  /** Bumps when the same toast is re-shown (dedupe) so the dismiss timer resets. */
  generation: number;
};

type PopupState = {
  items: ToastItem[];
  show: (message: string, type: PopupType) => void;
  dismiss: (id: number) => void;
};

const DISMISS_MS = 3200;
const MAX_VISIBLE = 3;

/** Inline Lucide icons — work offline (no `/toasts/*.svg` fetch). */
function ToastGlyph({ type }: { type: PopupType }): ReactNode {
  switch (type) {
    case "success":
      return <Check className="size-[18px]" strokeWidth={2.6} aria-hidden />;
    case "error":
      return <XIcon className="size-[18px]" strokeWidth={2.6} aria-hidden />;
    case "info":
      return <Info className="size-[18px]" strokeWidth={2.4} aria-hidden />;
    case "warning":
      return (
        <AlertTriangle className="size-[17px]" strokeWidth={2.4} aria-hidden />
      );
  }
}

let nextId = 1;

export const usePopup = create<PopupState>((set) => ({
  items: [],
  show: (message, type) => {
    set((state) => {
      const existing = state.items.find(
        (item) => item.message === message && item.type === type,
      );
      if (existing) {
        // Dedupe: keep one island, bump generation so the dismiss effect restarts.
        return {
          items: state.items.map((item) =>
            item.id === existing.id
              ? { ...item, generation: item.generation + 1 }
              : item,
          ),
        };
      }
      const id = nextId++;
      const next = [
        ...state.items,
        { id, type, message, generation: 0 },
      ];
      return {
        items:
          next.length > MAX_VISIBLE
            ? next.slice(next.length - MAX_VISIBLE)
            : next,
      };
    });
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

/** Mount once (AppProviders). Portals a tidy vertical stack at the top. */
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
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[110] flex justify-center px-4",
        "top-[max(3.5rem,calc(env(safe-area-inset-top)+2.75rem))]",
      )}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {/* Same-width column so islands stack as one tidy column */}
      <div className="flex w-full max-w-[min(92vw,22rem)] flex-col gap-2">
        {items.map((item, index) => (
          <ToastIsland
            key={item.id}
            item={item}
            stackIndex={index}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function ToastIsland({
  item,
  stackIndex,
  onDismiss,
}: {
  item: ToastItem;
  stackIndex: number;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(item.id);
    }, DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [item.id, item.generation, onDismiss]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      style={{ zIndex: 10 + stackIndex }}
      className={cn(
        "pointer-events-auto relative flex w-full items-center gap-2.5 rounded-2xl py-2.5 pr-2 pl-2.5",
        "bg-[#1a2e1a]/94 text-white shadow-[0_10px_28px_rgba(20,40,20,0.4)] ring-1 ring-white/12 backdrop-blur-md",
        "animate-[toast-island-in_280ms_ease-out]",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white",
          item.type === "success" && "bg-leaf",
          item.type === "error" && "bg-red-500",
          item.type === "warning" && "bg-amber-500 text-black",
          item.type === "info" && "bg-forest",
        )}
      >
        <ToastGlyph type={item.type} />
      </span>
      <p className="min-w-0 flex-1 py-0.5 text-[13px] leading-snug font-semibold text-white">
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
