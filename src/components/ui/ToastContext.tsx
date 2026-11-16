"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  /** Auto-dismiss. Default 3200ms. `0` = stay until dismissed. */
  durationMs?: number;
};

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastContextValue = {
  push: (input: ToastInput) => string;
  success: (message: string, durationMs?: number) => string;
  error: (message: string, durationMs?: number) => string;
  info: (message: string, durationMs?: number) => string;
  warning: (message: string, durationMs?: number) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_MS = 3200;
const MAX_VISIBLE = 3;

const TOAST_ICON: Record<ToastTone, string> = {
  success: "/toasts/success.svg",
  error: "/toasts/error.svg",
  info: "/toasts/info.svg",
  warning: "/toasts/warning.svg",
};

let toastSeq = 0;
function nextId() {
  toastSeq += 1;
  return `toast-${toastSeq}`;
}

/**
 * Floating island snackbars. Mount once at the root layout so toasts
 * survive route changes (e.g. guest heart → /login) and sit above sheets.
 * Icons from SVG Repo (www.svgrepo.com) under /public/toasts.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = nextId();
      const tone = input.tone ?? "info";
      const durationMs =
        input.durationMs === undefined ? DEFAULT_MS : input.durationMs;
      const item: ToastItem = {
        id,
        message: input.message,
        tone,
        durationMs,
      };
      setItems((prev) => {
        const next = [...prev, item];
        return next.length > MAX_VISIBLE
          ? next.slice(next.length - MAX_VISIBLE)
          : next;
      });
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (message, durationMs) =>
        push({ message, tone: "success", durationMs }),
      error: (message, durationMs) =>
        push({ message, tone: "error", durationMs }),
      info: (message, durationMs) =>
        push({ message, tone: "info", durationMs }),
      warning: (message, durationMs) =>
        push({ message, tone: "warning", durationMs }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Safe outside provider (e.g. optional demos). */
export function useToastOptional() {
  return useContext(ToastContext);
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[110] flex flex-col items-center gap-2.5 px-4"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((item) => (
        <ToastIsland key={item.id} item={item} onDismiss={onDismiss} />
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
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex max-w-[min(92vw,22rem)] items-center gap-2.5 rounded-full py-2 pr-2 pl-2.5",
        "bg-[#1a2e1a]/92 text-white shadow-[0_12px_40px_rgba(20,40,20,0.45)] ring-1 ring-white/12 backdrop-blur-md",
        "animate-[toast-island-in_280ms_ease-out]",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          item.tone === "success" && "bg-leaf",
          item.tone === "error" && "bg-red-500",
          item.tone === "warning" && "bg-amber-500",
          item.tone === "info" && "bg-forest",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TOAST_ICON[item.tone]}
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
