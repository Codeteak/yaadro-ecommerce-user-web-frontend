import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Pair to BackButton: same green diamond squircle, black X.
 * Use for sheet / modal dismiss across storefront + playground.
 */

type CloseButtonProps = {
  onClick?: () => void;
  label?: string;
  className?: string;
  iconClassName?: string;
};

export function CloseButton({
  onClick,
  label = "Close",
  className,
  iconClassName = "text-black",
}: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-[3px] rotate-45 rounded-[13px] bg-track shadow-[0_6px_16px_rgba(47,107,47,0.28)] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95"
      />
      <X
        aria-hidden
        strokeWidth={2.5}
        className={cn("relative z-10 size-5", iconClassName)}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}
