"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useScrollDirection } from "@/components/navigation/useScrollDirection";
import { cn } from "@/lib/cn";

type ViewCartBarProps = {
  /**
   * `fixed` — storefront chrome (viewport).
   * `inline` — playground preview inside a relative frame.
   */
  position?: "fixed" | "inline";
};

/**
 * Cart shortcut, right side above the bottom nav:
 * - Idle: compact circular cart button with an item-count badge.
 * - While scrolling: expands into the full "View cart • ₹total" bar,
 *   shrinking back ~1s after scrolling stops.
 * It also drops lower when the bottom nav hides on scroll-down.
 * Only appears when the basket has items; hidden on /cart and /checkout.
 */
export function ViewCartBar({ position = "fixed" }: ViewCartBarProps) {
  const pathname = usePathname();
  const { count, totalDue } = useCart();
  const { navHidden, scrolling } = useScrollDirection();
  const inline = position === "inline";

  if (count === 0 || pathname === "/cart" || pathname === "/checkout") return null;
  const expanded = scrolling;

  return (
    <div
      style={
        inline ? undefined : { viewTransitionName: "storefront-view-cart" }
      }
      className={cn(
        "z-40 transition-all duration-300 ease-out",
        inline
          ? "absolute right-4 bottom-4"
          : cn(
              "fixed right-5",
              navHidden
                ? "bottom-[max(1rem,env(safe-area-inset-bottom))]"
                : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]",
            ),
      )}
    >
      <Link
        href="/cart"
        transitionTypes={["nav-forward"]}
        aria-label={`View cart, ${count} ${count === 1 ? "item" : "items"}, total ₹${totalDue}`}
        className={cn(
          "relative flex h-14 items-center rounded-full bg-track text-black shadow-[0_18px_36px_rgba(47,107,47,0.4)] transition-all duration-300 ease-out hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
          expanded
            ? "w-[19rem] max-w-[calc(100vw-2.5rem)] justify-between px-5"
            : "w-14 justify-center",
        )}
      >
        <span className="flex items-center">
          <span className="relative shrink-0">
            <ShoppingCart className="h-5.5 w-5.5 text-black" aria-hidden />
            <span
              className={cn(
                "absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-black ring-2 ring-track transition-all duration-200",
                expanded ? "scale-50 opacity-0" : "scale-100 opacity-100",
              )}
              aria-hidden
            >
              {count}
            </span>
          </span>
          <span
            className={cn(
              "overflow-hidden text-sm font-semibold whitespace-nowrap text-black transition-all duration-300",
              expanded ? "ml-2.5 max-w-24 opacity-100" : "max-w-0 opacity-0",
            )}
          >
            {count} {count === 1 ? "item" : "items"}
          </span>
        </span>

        <span
          className={cn(
            "flex items-center gap-2 overflow-hidden text-sm font-bold whitespace-nowrap text-black transition-all duration-300",
            expanded ? "max-w-44 opacity-100" : "max-w-0 opacity-0",
          )}
        >
          View cart • ₹{totalDue}
          <ArrowRight className="h-4.5 w-4.5 shrink-0 text-black" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
