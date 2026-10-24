import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Phone-width stage on paper so demos match storefront proportions. */
export function DemoFrame({
  children,
  note,
  /**
   * `card` — rounded paper shell (default).
   * `bare` — no shell/shadow/overflow clip (e.g. floating Checkout pill).
   */
  surface = "card",
}: {
  children: ReactNode;
  note?: string;
  surface?: "card" | "bare";
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      {note ? (
        <p className="mb-3 text-[13px] leading-5 text-muted">{note}</p>
      ) : null}
      <div
        className={cn(
          surface === "card" &&
            "overflow-hidden rounded-[1.75rem] bg-paper shadow-[0_16px_40px_rgba(47,107,47,0.12)] ring-1 ring-forest/10",
        )}
      >
        {children}
      </div>
    </div>
  );
}
