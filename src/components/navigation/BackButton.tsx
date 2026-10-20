import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export type BackButtonVariant = "track" | "forest" | "leaf" | "light";

/**
 * Diamond-squircle back button (like the reference), recoloured to the
 * Yaadro ecom theme instead of pure black:
 * - track  `#0a2a1f` deep green-black (swipe track / active nav)
 * - forest `#064e3b` brand ink green
 * - leaf   `#16a34a` primary green
 * - light  paper white with forest arrow (for green/washed headers)
 */
const variantStyles: Record<BackButtonVariant, { shape: string; arrow: string }> = {
  track: {
    shape: "bg-track shadow-[0_6px_16px_rgba(10,42,31,0.28)]",
    arrow: "text-white",
  },
  forest: {
    shape: "bg-forest shadow-[0_6px_16px_rgba(6,78,59,0.28)]",
    arrow: "text-white",
  },
  leaf: {
    shape: "bg-leaf shadow-[0_6px_16px_rgba(22,163,74,0.32)]",
    arrow: "text-white",
  },
  light: {
    shape: "bg-white shadow-[0_6px_16px_rgba(6,78,59,0.14)] ring-1 ring-leaf/25",
    arrow: "text-forest",
  },
};

type BackButtonProps = {
  /** Link target. Omit when using `onClick` (e.g. closing a sheet). */
  href?: string;
  onClick?: () => void;
  variant?: BackButtonVariant;
  label?: string;
  className?: string;
};

export function BackButton({
  href,
  onClick,
  variant = "track",
  label = "Back",
  className,
}: BackButtonProps) {
  const styles = variantStyles[variant];

  const content = (
    <>
      {/* Rotated squircle — arrow itself stays upright */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-[3px] rotate-45 rounded-[13px] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95",
          styles.shape,
        )}
      />
      <ArrowLeft
        aria-hidden
        strokeWidth={2.5}
        className={cn("relative z-10 size-5", styles.arrow)}
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
      <Link href={href} aria-label={label} className={classes}>
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
