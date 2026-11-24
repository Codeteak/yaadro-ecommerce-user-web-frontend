"use client";

import { useState } from "react";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { HelpSupportContent } from "@/components/profile/HelpSupportContent";
import { PriceMayVaryExplainSheet } from "@/components/storefront/PriceMayVaryExplainSheet";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import {
  clearNavReturnStack,
  peekNavReturn,
  popNavReturn,
  pushNavReturn,
} from "@/lib/nav-return-stack";
import { PRICE_MAY_VARY_TOPIC } from "@/lib/price-may-vary";
import { SAMPLE_SHOP_SUPPORT } from "@/lib/sample-shop-support";

type Panel = "cart" | "checkout" | "help";

const DEMO_RETURN = "/playground/price-vary-explain";

/**
 * Phase D #33 playground — cart → Checkout opens explain popup → after
 * reading, checkout page shows. `?` opens the same popup. Help FAQ uses
 * the return stack back to checkout.
 */
export function PhaseDPriceVaryExplainDemo() {
  const [panel, setPanel] = useState<Panel>("cart");
  const [explainOpen, setExplainOpen] = useState(false);
  /** Popup opened from Checkout CTA (continue goes to checkout). */
  const [fromCheckoutCta, setFromCheckoutCta] = useState(false);
  const [stackHint, setStackHint] = useState(() => peekNavReturn());

  const openExplainBeforeCheckout = () => {
    setFromCheckoutCta(true);
    setExplainOpen(true);
  };

  const continueToCheckout = () => {
    setExplainOpen(false);
    setFromCheckoutCta(false);
    setPanel("checkout");
  };

  const goHelp = () => {
    pushNavReturn(panel === "checkout" ? "checkout" : "cart");
    setStackHint(peekNavReturn());
    setPanel("help");
  };

  const goBackFromHelp = () => {
    const target = popNavReturn();
    setStackHint(peekNavReturn());
    setPanel(target === "checkout" ? "checkout" : "cart");
  };

  if (panel === "help") {
    return (
      <div className="bg-paper">
        <div className="border-b border-forest/10 bg-mint/30 px-4 py-2 text-[12px] text-muted">
          Return stack head:{" "}
          <code className="text-ink">{stackHint ?? "(empty)"}</code>
          {" · "}
          <button
            type="button"
            onClick={() => {
              clearNavReturnStack();
              setStackHint(null);
            }}
            className="font-semibold text-forest underline-offset-2 hover:underline"
          >
            Clear stack
          </button>
        </div>
        <HelpSupportContent
          contact={SAMPLE_SHOP_SUPPORT}
          backHref={DEMO_RETURN}
          initialTopic={PRICE_MAY_VARY_TOPIC}
          className="min-h-0"
          topicHrefFor={(href) =>
            href === "/profile/addresses"
              ? "/playground/address-modal-shared"
              : `/playground${href}`
          }
        />
        <div className="sticky bottom-0 border-t border-forest/10 bg-paper px-5 py-3">
          <button
            type="button"
            onClick={goBackFromHelp}
            className="h-11 w-full rounded-full bg-track text-sm font-bold text-black"
          >
            Back via return stack
          </button>
        </div>
      </div>
    );
  }

  if (panel === "checkout") {
    return (
      <div className="relative flex h-[75vh] flex-col bg-paper">
        <div className="shrink-0 border-b border-forest/10 bg-mint/25 px-4 py-2 text-[12px] leading-5 text-muted">
          After reading the popup → checkout.{" "}
          <button
            type="button"
            onClick={() => setPanel("cart")}
            className="font-semibold text-forest underline-offset-2 hover:underline"
          >
            Back to cart
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CheckoutPageContent
            chromePosition="inline"
            showPriceMayVary
            previewSignedIn
          />
        </div>
        <PriceMayVaryExplainSheet
          open={explainOpen}
          onOpenChange={setExplainOpen}
          onHelpClick={goHelp}
        />
      </div>
    );
  }

  // Cart panel — Checkout opens popup first; continue reveals checkout.
  return (
    <div className="relative flex h-[75vh] flex-col bg-paper">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <div>
          <p className="text-[13px] font-semibold text-forest">
            Phase D · #33
          </p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Notice is display-only (no question mark). Tap{" "}
            <strong className="font-semibold text-ink">Checkout</strong> →
            explain popup. After Continue, the checkout page shows.
          </p>
        </div>

        <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-black/[0.06]">
          <h3 className="text-sm font-extrabold text-black">Cart</h3>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Sample cart strip — Checkout is gated by the price-vary popup.
          </p>
          <div className="mt-4 space-y-3 rounded-2xl bg-paper p-3 ring-1 ring-forest/10">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">2 items</span>
              <span className="font-bold tabular-nums text-black">₹480</span>
            </div>
            <PriceMayVaryNotice variant="soft" />
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-forest/10 bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={openExplainBeforeCheckout}
          className="flex h-12 w-full items-center justify-center rounded-full bg-track text-sm font-bold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Checkout · ₹480
        </button>
      </div>

      <PriceMayVaryExplainSheet
        open={explainOpen}
        onOpenChange={(next) => {
          setExplainOpen(next);
          if (!next) setFromCheckoutCta(false);
        }}
        continueLabel={
          fromCheckoutCta ? "Continue to checkout" : undefined
        }
        onContinue={fromCheckoutCta ? continueToCheckout : undefined}
        onHelpClick={goHelp}
      />
    </div>
  );
}
