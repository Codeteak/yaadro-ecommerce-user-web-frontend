"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

export type PopupType = "success" | "error" | "info" | "warning";

type Popup = {
  id: number;
  type: PopupType;
  message: string;
};

type PopupState = {
  popup: Popup | null;
  show: (message: string, type: PopupType) => void;
  dismiss: () => void;
};

const TITLE: Record<PopupType, string> = {
  success: "Done",
  error: "Something went wrong",
  info: "Note",
  warning: "Check this",
};

const ICON_CLASS: Record<PopupType, string> = {
  success: "bg-leaf text-white",
  error: "bg-red-500 text-white",
  info: "bg-forest text-white",
  warning: "bg-amber-500 text-white",
};

const DISMISS_MS = 2800;

let nextId = 1;
let timer = 0;

export const usePopup = create<PopupState>((set, get) => ({
  popup: null,
  show: (message, type) => {
    const id = nextId++;
    window.clearTimeout(timer);
    set({ popup: { id, type, message } });
    timer = window.setTimeout(() => {
      if (get().popup?.id === id) set({ popup: null });
    }, DISMISS_MS);
  },
  dismiss: () => {
    window.clearTimeout(timer);
    set({ popup: null });
  },
}));

/** Show one status card. A new call replaces the card that is already open. */
export function showPopup(message: string, type: PopupType) {
  usePopup.getState().show(message, type);
}

/** Only this viewport re-renders when a popup opens or closes. */
export function ToastViewport() {
  const popup = usePopup((state) => state.popup);
  const dismiss = usePopup((state) => state.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !popup) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 cursor-default bg-black/20 backdrop-blur-[2px]"
        onClick={dismiss}
      />
      <button
        type="button"
        onClick={dismiss}
        role={popup.type === "error" ? "alert" : "status"}
        className="popup-card relative flex w-full max-w-sm items-center gap-3.5 rounded-[1.75rem] bg-white px-4 py-4 text-left shadow-[0_18px_40px_rgba(20,20,40,0.16)]"
      >
        <PopupIcon type={popup.type} />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-tight font-extrabold text-black">
            {TITLE[popup.type]}
          </span>
          <span className="mt-1 block text-[13px] leading-5 font-medium text-muted">
            {popup.message}
          </span>
        </span>
      </button>
    </div>,
    document.body,
  );
}

function PopupIcon({ type }: { type: PopupType }) {
  return (
    <span
      className={`popup-icon grid h-12 w-12 shrink-0 place-items-center rounded-full ${ICON_CLASS[type]}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        {type === "success" ? (
          <path
            d="M5 12.5 10 17.5 19 7"
            pathLength="1"
            className="popup-stroke"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {type === "error" ? (
          <path
            d="M7 7 17 17 M17 7 7 17"
            pathLength="1"
            className="popup-stroke"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ) : null}
        {type === "info" ? (
          <>
            <path
              d="M12 11v6"
              pathLength="1"
              className="popup-stroke"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M12 7.5h.01"
              pathLength="1"
              className="popup-stroke"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </>
        ) : null}
        {type === "warning" ? (
          <>
            <path
              d="M12 8v5"
              pathLength="1"
              className="popup-stroke"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M12 16.5h.01"
              pathLength="1"
              className="popup-stroke"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </>
        ) : null}
      </svg>
    </span>
  );
}
