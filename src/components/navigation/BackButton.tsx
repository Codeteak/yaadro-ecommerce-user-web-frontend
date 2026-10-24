import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Diamond-squircle back button (like the reference), recoloured to the
 * Yaadro ecom theme instead of pure black. One colour everywhere:
 * track brand green (same as swipe track / active nav pill).
 */

type BackButtonProps = {
  /** Link target. Omit when using `onClick` (e.g. closing a sheet). */
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  /** Arrow colour. Default black on the green squircle (storefront + playground). */
  iconClassName?: string;
};

export function BackButton({
  href,
  onClick,
  label = "Back",
  className,
  iconClassName = "text-black",
}: BackButtonProps) {
  const content = (
    <>
      {/* Rotated squircle — arrow itself stays upright */}
      <span
        aria-hidden
        className="absolute inset-[3px] rotate-45 rounded-[13px] bg-track shadow-[0_6px_16px_rgba(47,107,47,0.28)] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95"
      />
      <ArrowLeft
        aria-hidden
        strokeWidth={2.5}
        className={cn("relative z-10 size-5", iconClassName)}
      />
      <span className="sr-only">{label}</span>
    </>
  );

  const classes = cn(
    "group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        transitionTypes={["nav-back"]}
        aria-label={label}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes}>
      {content}
    </button>
  );
}
