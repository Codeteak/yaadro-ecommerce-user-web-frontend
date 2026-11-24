"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { orderLineLabel, type SampleOrder } from "@/lib/sample-orders";
import {
  billedTotal,
  deliveryCharge,
  inr,
  lineName,
} from "@/components/orders/lead-order-format";
import { Dash, Pair } from "@/components/orders/OrderBillRows";
import { showPopup } from "@/components/ui/Toast";

export function OrderReceiptDialog({
  order,
  onClose,
}: {
  order: SampleOrder;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const charge = deliveryCharge(order);
  const total = billedTotal(order);
  const text = [
    "YAADRO",
    `Bill  ${order.number}`,
    `Order  ${order.id}`,
    "",
    ...order.lines.map(
      (line) =>
        `${line.isWeight ? orderLineLabel(line) : `${line.qty} ×`} ${lineName(line)}  ${inr(line.lineTotal)}`,
    ),
    "",
    `Item total  ${inr(order.subtotal)}`,
    ...(order.promoDiscount > 0
      ? [
          `${order.promoCode ? `Coupon (${order.promoCode})` : "Promo"}  −${inr(order.promoDiscount)}`,
        ]
      : []),
    ...(charge > 0 ? [`Delivery fee  ${inr(charge)}`] : []),
    `Total  ${inr(total)}`,
  ].join("\n");

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-paper sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-receipt-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-2 flex items-center justify-between">
          <p id="order-receipt-title" className="font-mono text-sm font-bold text-black">
            Yaadro bill
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white"
            aria-label="Close bill"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <article className="bg-[#FDFBF7] px-5 py-6 font-mono text-[13px] leading-snug text-[#1F1C18] shadow-[0_15px_35px_rgba(47,107,47,0.18)] ring-1 ring-forest/10">
            <p className="text-center text-[15px] font-extrabold tracking-wide text-forest">YAADRO</p>
            <p className="mt-1 text-center text-[11px] tracking-wide text-[#1F1C18]/60">
              {order.addressLabel}
            </p>
            <Dash />
            <Pair label="BILL" value={order.number} />
            <Pair label="DATE" value={order.placedAtLabel} />
            <Pair label="PAYMENT" value={order.paymentLabel} />
            <Dash />
            <div className="flex justify-between text-[11px] tracking-wide text-[#1F1C18]/60">
              <span>ITEM</span>
              <span>PRICE</span>
            </div>
            <ul className="mt-1 space-y-1">
              {order.lines.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3">
                  <span>
                    {line.isWeight ? orderLineLabel(line) : `${line.qty}×`} {lineName(line)}
                  </span>
                  <span>{inr(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <Dash />
            <Pair label="Item total" value={inr(order.subtotal)} />
            {order.promoDiscount > 0 ? (
              <Pair
                label={order.promoCode ? `Coupon (${order.promoCode})` : "Promo"}
                value={`−${inr(order.promoDiscount)}`}
              />
            ) : null}
            {charge > 0 ? (
              <Pair label="Delivery fee" value={inr(charge)} />
            ) : null}
            <div className="mt-1 flex justify-between text-[15px] font-extrabold">
              <span>Total</span>
              <span>{inr(total)}</span>
            </div>
            <p className="mt-4 text-center text-[11px] text-[#1F1C18]/60">
              Thank you for shopping with Yaadro
            </p>
          </article>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!navigator.clipboard?.writeText) {
                showPopup("Couldn’t copy", "error");
                return;
              }
              void navigator.clipboard.writeText(text).then(
                () => {
                  setCopied(true);
                  showPopup("Copied", "success");
                  window.setTimeout(() => setCopied(false), 1600);
                },
                () => showPopup("Couldn’t copy", "error"),
              );
            }}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[18px] bg-white text-[13px] font-bold text-black ring-1 ring-[#E6E6EA]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied ? "Copied" : "Copy bill"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[18px] bg-track text-[13px] font-bold text-black"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
