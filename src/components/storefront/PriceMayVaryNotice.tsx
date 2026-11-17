import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

type PriceMayVaryNoticeProps = {
  className?: string;
  /**
   * `soft` — storefront default (cart, checkout, PDP).
   * `banner` — legacy full-width strip (kept for comparison).
   */
  variant?: "banner" | "soft";
};

/**
 * Visible disclaimer that listed prices can change (e.g. weighable items).
 * Message is centered in both variants.
 */
export function PriceMayVaryNotice({
  className,
  variant = "banner",
}: PriceMayVaryNoticeProps) {
  if (variant === "soft") {
    return (
      <p
        role="note"
        className={cn(
          "mx-auto flex w-fit max-w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-3.5 py-2 text-center text-[12px] leading-4 font-semibold text-black ring-1 ring-orange-600/30",
          className,
        )}
      >
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-black"
          strokeWidth={2.25}
          aria-hidden
        />
        <span>Prices may vary on some products</span>
      </p>
    );
  }

  return (
    <p
      role="note"
      className={cn(
        "mx-auto flex w-full max-w-lg overflow-hidden rounded-xl border border-amber-400 bg-amber-50",
        className,
      )}
    >
      <span className="w-1 shrink-0 bg-amber-500" aria-hidden />
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2 px-3.5 py-3 text-center text-[13px] leading-5 font-bold text-amber-950">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-amber-600"
          strokeWidth={2.25}
          aria-hidden
        />
        <span>Prices may vary on some products</span>
      </span>
    </p>
  );
}
