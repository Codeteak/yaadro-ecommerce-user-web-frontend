"use client";

import { showPopup, type PopupType } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Sample = {
  label: string;
  tone: PopupType;
  message: string;
};

const SAMPLES: { group: string; items: Sample[] }[] = [
  {
    group: "Cart / promo",
    items: [
      {
        label: "Promo applied",
        tone: "success",
        message: "Applied FRESH50 — you save ₹50",
      },
      { label: "Empty code", tone: "error", message: "Enter a promo code" },
      { label: "Not found", tone: "error", message: "Code not found" },
      {
        label: "Already used",
        tone: "error",
        message: "This code was already used",
      },
      { label: "Expired", tone: "error", message: "This code has expired" },
      {
        label: "Min order",
        tone: "error",
        message: "Add ₹120 more to use this code",
      },
      {
        label: "Can’t apply",
        tone: "error",
        message: "Code can’t be applied to this basket",
      },
      { label: "Promo removed", tone: "info", message: "Promo removed" },
      { label: "Basket cleared", tone: "info", message: "Basket cleared" },
    ],
  },
  {
    group: "Wishlist",
    items: [
      {
        label: "Saved",
        tone: "success",
        message: "Saved to wishlist",
      },
      {
        label: "Removed",
        tone: "info",
        message: "Removed from wishlist",
      },
      {
        label: "Guest heart",
        tone: "info",
        message: "Sign in to save favourites",
      },
    ],
  },
  {
    group: "Orders / bill",
    items: [
      { label: "Copied", tone: "success", message: "Copied" },
      { label: "Downloaded", tone: "success", message: "Download started" },
      { label: "Copy failed", tone: "error", message: "Couldn’t copy" },
    ],
  },
  {
    group: "Addresses",
    items: [
      { label: "Saved", tone: "success", message: "Address saved" },
      { label: "Updated", tone: "success", message: "Address updated" },
      { label: "Deleted", tone: "info", message: "Address deleted" },
      {
        label: "Default set",
        tone: "success",
        message: "Default address updated",
      },
      {
        label: "Form incomplete",
        tone: "error",
        message: "Save name and building / floor are required.",
      },
    ],
  },
  {
    group: "Catalog / checkout",
    items: [
      {
        label: "Catalog fail",
        tone: "error",
        message: "We couldn't load the shop catalog. Pull to try again.",
      },
      {
        label: "Generic fail",
        tone: "error",
        message: "Something went wrong. Try again.",
      },
      { label: "Order placed", tone: "success", message: "Order placed" },
      {
        label: "Order fail",
        tone: "error",
        message: "Couldn’t place order. Try again.",
      },
      {
        label: "Prices may vary",
        tone: "warning",
        message: "Prices may vary on some products.",
      },
    ],
  },
];

/**
 * Playground lab for toast tones + planned copy strings.
 */
export function ToastDemo() {
  return (
    <div className="space-y-6 bg-paper px-4 py-5 sm:px-5">
      <div className="flex flex-wrap gap-2">
        <ToneButton
          label="Success"
          className="bg-mint text-forest"
          onClick={() => showPopup("Saved to wishlist", "success")}
        />
        <ToneButton
          label="Error"
          className="bg-red-50 text-red-700"
          onClick={() => showPopup("Code not found", "error")}
        />
        <ToneButton
          label="Info"
          className="bg-white text-forest ring-1 ring-forest/15"
          onClick={() => showPopup("Promo removed", "info")}
        />
        <ToneButton
          label="Warning"
          className="bg-amber-50 text-amber-800"
          onClick={() =>
            showPopup("Prices may vary on some products.", "warning")
          }
        />
      </div>

      {SAMPLES.map((group) => (
        <section key={group.group}>
          <h3 className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            {group.group}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.items.map((item) => (
              <li key={`${group.group}-${item.label}`}>
                <button
                  type="button"
                  onClick={() =>
                    showPopup(item.message, item.tone)
                  }
                  className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink ring-1 ring-black/8 transition hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[12px] leading-5 text-muted">
        One centered card. Pass the message and the type. Auto-dismiss
        ~2.8s. Wired on storefront (cart, wishlist, coupons, addresses,
        orders, checkout, login).
      </p>
    </div>
  );
}

function ToneButton({
  label,
  className,
  onClick,
}: {
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-2 text-[13px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
        className,
      )}
    >
      {label}
    </button>
  );
}
