"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  PLAYGROUND_ENTRIES,
  playgroundGroups,
  type PlaygroundEntry,
} from "@/lib/playground/catalog";
import {
  getAsideScrollTop,
  setAsideScrollTop,
  setPlaygroundLastSlug,
} from "@/lib/playground/session";
import { BRAND_GREEN } from "@/lib/playground/theme-preview";
import { cn } from "@/lib/cn";

const HIDE_KEY = "yaadro-playground-chrome-hidden";

function subscribeChrome(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("yaadro-playground-chrome", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("yaadro-playground-chrome", onStoreChange);
  };
}

function getChromeHidden() {
  try {
    return sessionStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function getChromeHiddenServer() {
  return false;
}

function setChromeHidden(next: boolean) {
  try {
    sessionStorage.setItem(HIDE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("yaadro-playground-chrome"));
}

function StatusPill({ status }: { status: PlaygroundEntry["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
        status === "built"
          ? "bg-mint text-forest"
          : "bg-black/5 text-muted",
      )}
    >
      {status}
    </span>
  );
}

function CatalogNav({
  pathname,
  asideRef,
}: {
  pathname: string;
  asideRef: RefObject<HTMLDivElement | null>;
}) {
  const groups = playgroundGroups();

  return (
    <nav className="space-y-4" aria-label="Playground components">
      {groups.map(([group, entries]) => (
        <div key={group}>
          <p className="px-2 text-[10px] font-bold tracking-wide text-muted uppercase">
            {group}
          </p>
          <ul className="mt-1 space-y-0.5">
            {entries.map((entry) => {
              const href = `/playground/${entry.slug}`;
              const active = pathname === href;
              return (
                <li key={entry.slug}>
                  <Link
                    href={href}
                    data-playground-nav-slug={entry.slug}
                    onClick={() => {
                      setPlaygroundLastSlug(entry.slug);
                      if (asideRef.current) {
                        setAsideScrollTop(asideRef.current.scrollTop);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium transition sm:text-[13px]",
                      active
                        ? "bg-track text-white"
                        : "text-ink hover:bg-mint/60",
                    )}
                  >
                    <span className="min-w-0 truncate">{entry.title}</span>
                    <StatusPill status={entry.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Always shows a vertical, scrollable catalog (all built + planned).
 * Chrome can be hidden for full-width demos via the Hide / Show button.
 */
export function PlaygroundShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const built = PLAYGROUND_ENTRIES.filter((e) => e.status === "built").length;
  const planned = PLAYGROUND_ENTRIES.filter((e) => e.status === "planned").length;
  const hidden = useSyncExternalStore(
    subscribeChrome,
    getChromeHidden,
    getChromeHiddenServer,
  );
  const hide = useCallback(() => setChromeHidden(true), []);
  const show = useCallback(() => setChromeHidden(false), []);
  const asideScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = pathname.match(/^\/playground\/([^/]+)/);
    if (match?.[1]) setPlaygroundLastSlug(match[1]);
  }, [pathname]);

  useEffect(() => {
    const el = asideScrollRef.current;
    if (!el) return;
    const saved = getAsideScrollTop();
    if (saved != null) el.scrollTop = saved;

    const onScroll = () => setAsideScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hidden, pathname]);

  return (
    <div
      className="min-h-dvh text-ink"
      style={{ backgroundColor: BRAND_GREEN.shellBg }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        {!hidden ? (
          <aside className="sticky top-0 flex h-dvh w-[11.5rem] shrink-0 flex-col overflow-hidden border-r border-forest/10 bg-paper sm:w-60">
            <div className="shrink-0 border-b border-forest/8 px-2 py-3 sm:px-3">
              <div className="flex items-start justify-between gap-1">
                <Link
                  href="/playground"
                  className="min-w-0 flex-1 rounded-xl px-1.5 py-1.5 transition hover:bg-mint/50 sm:px-2"
                >
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-leaf uppercase">
                    Dev only
                  </p>
                  <p className="text-sm font-extrabold text-forest sm:text-base">
                    Playground
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted sm:text-[11px]">
                    {built} built · {planned} planned
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={hide}
                  aria-label="Hide playground catalog"
                  title="Hide catalog"
                  className="mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  <PanelLeftClose className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div
              ref={asideScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-3 sm:px-3"
            >
              <CatalogNav pathname={pathname} asideRef={asideScrollRef} />
            </div>

            <div className="shrink-0 space-y-2 border-t border-forest/8 px-2 py-3 sm:px-3">
              <button
                type="button"
                onClick={hide}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-mint/70 px-2 py-2 text-[11px] font-semibold text-forest transition hover:bg-mint sm:text-[12px]"
              >
                <PanelLeftClose className="size-3.5" aria-hidden />
                Hide catalog
              </button>
              <Link
                href="/home"
                className="block text-center text-[11px] font-semibold text-leaf hover:text-leaf-bright sm:text-[12px]"
              >
                ← Storefront
              </Link>
            </div>
          </aside>
        ) : null}

        <main className="relative min-w-0 flex-1 overflow-x-clip px-3 py-5 sm:px-8 sm:py-8">
          {hidden ? (
            <button
              type="button"
              onClick={show}
              aria-label="Show playground catalog"
              className="fixed top-3 left-3 z-50 flex cursor-pointer items-center gap-1.5 rounded-full bg-track px-3 py-2 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(47,107,47,0.28)] transition hover:bg-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <PanelLeftOpen className="size-3.5" aria-hidden />
              Show playground
            </button>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
