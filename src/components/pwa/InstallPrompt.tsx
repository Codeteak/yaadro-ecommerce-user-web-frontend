"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/** Session-only dismiss — cleared when the browser/tab session ends. */
const DISMISS_KEY = "yaadro-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function wasDismissedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissedThisSession() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

type InstallPromptProps = {
  /**
   * Playground: show the sheet without waiting for `/home` or
   * `beforeinstallprompt` (browser may not fire it in demos).
   */
  forcePreview?: boolean;
};

/**
 * “Add to Home Screen” — only on ecom `/home`. Dismiss lasts for this
 * browser session; closing the tab/browser lets it show again next visit.
 *
 * `usePathname` is behind Suspense so Cache Components can prerender routes
 * that mount AppProviders without blocking on the URL.
 */
export function InstallPrompt(props: InstallPromptProps) {
  return (
    <Suspense fallback={null}>
      <InstallPromptInner {...props} />
    </Suspense>
  );
}

function InstallPromptInner({ forcePreview = false }: InstallPromptProps) {
  const pathname = usePathname();
  const onEcomHome = forcePreview || pathname === "/home";
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (forcePreview) return;
    if (wasDismissedThisSession()) return;

    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [forcePreview]);

  const open =
    !userDismissed &&
    !wasDismissedThisSession() &&
    (forcePreview || (Boolean(event) && onEcomHome));

  if (!open) {
    return null;
  }

  const dismiss = () => {
    markDismissedThisSession();
    setUserDismissed(true);
  };

  const install = async () => {
    if (event) {
      await event.prompt();
      try {
        await event.userChoice;
      } catch {
        // ignore
      }
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
