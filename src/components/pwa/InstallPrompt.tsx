"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const SEEN_KEY = "yaadro-pwa-install-seen";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * “Add to Home Screen” sheet when the browser fires beforeinstallprompt.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      // ignore
    }

    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!open || !event) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
    setEvent(null);
  };

  const install = async () => {
    await event.prompt();
    try {
      await event.userChoice;
    } catch {
      // ignore
    }
    dismiss();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="relative rounded-[1.5rem] bg-paper p-4 shadow-[0_-12px_40px_rgba(47,107,47,0.28)] ring-1 ring-forest/12">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-mint"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="pr-8 text-sm font-extrabold text-black">Install this shop</p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Add to your home screen for faster grocery orders.
        </p>
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-track text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] hover:bg-leaf-bright"
        >
          <Download className="h-4 w-4" aria-hidden />
          Add to Home Screen
        </button>
      </div>
    </div>
  );
}
