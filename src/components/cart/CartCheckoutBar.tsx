"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRupees } from "@/lib/cart-checkout-rules";

type CartCheckoutBarProps = {
  toPay: number;
  checkingOut?: boolean;
  disabled?: boolean;
  signedIn: boolean;
  inline?: boolean;
  onCheckout: () => void;
};

/**
 * Fixed bottom Checkout CTA with To pay amount.
 */
export function CartCheckoutBar({
  toPay,
  checkingOut = false,
  disabled = false,
  signedIn,
  inline = false,
  onCheckout,
}: CartCheckoutBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none z-30 px-5",
        inline
          ? "absolute inset-x-0 bottom-0 pb-6"
          : "fixed inset-x-0 bottom-0 mx-auto w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]",
      )}
    >
      <button
        type="button"
        onClick={onCheckout}
        disabled={checkingOut || disabled}
        aria-label="Proceed to checkout"
        className="group pointer-events-auto relative flex w-full cursor-pointer items-center rounded-full bg-track px-5 py-4 text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-100"
      >
        <span className="text-xl leading-tight font-extrabold tabular-nums">
          {formatRupees(toPay)}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold tracking-tight text-black">
          {checkingOut
            ? "Checking…"
            : !signedIn
              ? "Sign in to checkout"
              : "Checkout"}
        </span>
        <span className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-[0_3px_0_0_rgba(0,0,0,0.12)] motion-safe:group-active:shadow-none">
          <ArrowRight className="h-5 w-5 text-black" aria-hidden />
        </span>
      </button>
    </div>
  );
}
