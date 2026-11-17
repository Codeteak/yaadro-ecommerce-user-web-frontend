"use client";

import { create } from "zustand";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastState = {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }].slice(-3) }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function showToast(tone: ToastTone, message: string) {
  useToasts.getState().push(tone, message);
}

export function ToastViewport() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] mx-auto flex w-full max-w-lg flex-col gap-2 px-5"
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
