"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BackButton } from "./BackButton";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  /** Back target. Omit when using `onBackClick`. */
  backHref?: string;
  onBackClick?: () => void;
  backLabel?: string;
  /** Centered title text. Ignored when `center` is given. */
  title?: string;
  /** Custom centered content (e.g. the brand logo on Login). */
  center?: ReactNode;
  /**
   * `paper` — sticky paper bar (default storefront pages).
   * `hero` — transparent sticky bar over mint/gradient heroes (profile).
   */
  surface?: "paper" | "hero";
};

const TITLE_HIDE_Y = 32;

function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function scrollTopOf(target: HTMLElement | Window): number {
  return target instanceof Window ? target.scrollY : target.scrollTop;
}

/**
 * Sticky page header: stays at the top while scrolling. Past a small
 * threshold the title/center hide so only the back control remains
 * visible and usable. Safe-area padding lives on this bar.
 */
export function PageHeader({
  backHref,
  onBackClick,
  backLabel,
  title,
  center,
  surface = "paper",
}: PageHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const scroller = getScrollParent(root);

    const onScroll = () => {
      setTitleHidden(scrollTopOf(scroller) > TITLE_HIDE_Y);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={rootRef}
      className={cn(
        "sticky top-0 z-20 -mx-5 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2",
        // Hero: stay transparent so only the back control floats — no bar
        // covering the avatar when the title collapses.
        surface === "hero" ? "bg-transparent" : "bg-paper/95 backdrop-blur-sm",
      )}
    >
      <div className="relative flex h-11 shrink-0 items-center">
        <BackButton href={backHref} onClick={onBackClick} label={backLabel} />
        {center ? (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 transition-opacity duration-200",
              titleHidden
                ? "pointer-events-none opacity-0"
                : "pointer-events-auto opacity-100",
            )}
          >
            {center}
          </div>
        ) : title ? (
          <h1
            className={cn(
              "absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight whitespace-nowrap text-forest transition-opacity duration-200",
              titleHidden
                ? "pointer-events-none opacity-0"
                : "pointer-events-auto opacity-100",
            )}
          >
            {title}
          </h1>
        ) : null}
        <span className="ml-auto size-11" aria-hidden />
      </div>
    </header>
  );
}
