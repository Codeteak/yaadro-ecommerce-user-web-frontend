import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Visible disclaimer that listed prices can change (e.g. weighable items).
 * Warning-theme banner on cart and checkout.
 */
export function PriceMayVaryNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex overflow-hidden rounded-xl border border-amber-400 bg-amber-50",
        className,
      )}
    >
      <span className="w-1 shrink-0 bg-amber-500" aria-hidden />
      <span className="flex min-w-0 flex-1 items-start gap-2 px-3.5 py-3 text-[13px] leading-5 font-bold text-amber-950">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          strokeWidth={2.25}
          aria-hidden
        />
        <span>Prices may vary on some products</span>
      </span>
    </p>
  );
}
