"use client";

import { create } from "zustand";

type ToastTone = "success" | "error" | "info";

type ToastPlace = "top" | "bottom";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  place: ToastPlace;
};

type ToastState = {
  toasts: Toast[];
  push: (tone: ToastTone, message: string, place?: ToastPlace) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message, place = "bottom") => {
    const id = nextId++;
    set((state) => ({
      toasts: [...state.toasts, { id, tone, message, place }].slice(-3),
    }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function showToast(tone: ToastTone, message: string, place: ToastPlace = "bottom") {
  useToasts.getState().push(tone, message, place);
}

export function ToastViewport() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  if (toasts.length === 0) return null;
  const top = toasts.filter((toast) => toast.place === "top");
  const bottom = toasts.filter((toast) => toast.place !== "top");
  return (
    <>
      <ToastStack toasts={top} dismiss={dismiss} place="top" />
      <ToastStack toasts={bottom} dismiss={dismiss} place="bottom" />
    </>
  );
}

function ToastStack({
  toasts,
  dismiss,
  place,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
  place: ToastPlace;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[80] mx-auto flex w-full max-w-lg flex-col gap-2 px-5 ${
        place === "top"
          ? "top-[max(0.75rem,env(safe-area-inset-top))]"
          : "bottom-6"
      }`}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-lg ${
            toast.tone === "error"
              ? "bg-red-700 text-white"
              : toast.tone === "success"
                ? "bg-forest text-white"
                : "bg-black text-white"
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
