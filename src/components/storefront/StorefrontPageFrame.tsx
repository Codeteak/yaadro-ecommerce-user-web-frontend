import type { ReactNode } from "react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { cn } from "@/lib/cn";

type StorefrontPageFrameProps = {
  title: string;
  backHref: string;
  children: ReactNode;
  className?: string;
  /**
   * `fill` — h-dvh column (categories browser).
   * `page` — min-h-dvh scroll page (wishlist, orders, …).
   * `embed` — min-h-full for inline sheets / nested hosts.
   */
  height?: "fill" | "page" | "embed";
};

/**
 * Phase B #29 — common fixed PageHeader + body. BottomNav comes from
 * StorefrontChrome. Use on task/list pages; home keeps HomeTopBar.
 */
export function StorefrontPageFrame({
  title,
  backHref,
  children,
  className,
  height = "page",
}: StorefrontPageFrameProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper",
        height === "fill"
          ? // Bound height so CategoryBrowser’s overflow-y pane can scroll.
            // Without this the product list grows with cards, overscroll-contain
            // traps touch, and only the category rail scrolls the page.
            "h-dvh min-h-0 overflow-hidden"
          : height === "embed"
            ? "min-h-full"
            : "min-h-dvh",
        className,
      )}
    >
      <div className="shrink-0 px-5">
        <PageHeader backHref={backHref} title={title} />
      </div>
      <div
        className={cn(
          "min-h-0 flex-1",
          height === "fill" && "flex flex-col overflow-hidden",
        )}
      >
        {children}
      </div>
    </main>
  );
}
