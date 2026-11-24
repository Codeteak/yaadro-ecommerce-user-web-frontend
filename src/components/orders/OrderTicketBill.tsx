"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { orderLineLabel, type SampleOrder } from "@/lib/sample-orders";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { useShopName } from "@/components/shop/ShopNameProvider";
import { showPopup } from "@/components/ui/Toast";
import {
  billedTotal,
  deliveryCharge,
  inr,
  lineName,
} from "@/components/orders/lead-order-format";
import { Dash, Pair } from "@/components/orders/OrderBillRows";

/**
 * Centered ticket bill with the real address and a PNG download.
 * Used on `/orders` and in the playground.
 */
export function OrderTicketBill({
  order,
  onClose,
}: {
  order: SampleOrder;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const shopName = useShopName();
  const charge = deliveryCharge(order);
  const total = billedTotal(order);

  const ticketRef = useRef<HTMLElement>(null);

  const copy = () => {
    const ticket = ticketRef.current;
    const canvas = ticket ? paintTicketPng(ticket, order, shopName) : null;
    if (!canvas || !navigator.clipboard?.write) {
      showPopup("Couldn’t copy", "error");
      return;
    }
    const png = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("bill png"))), "image/png");
    });
    void navigator.clipboard.write([new ClipboardItem({ "image/png": png })]).then(
      () => {
        setCopied(true);
        showPopup("Copied", "success");
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => showPopup("Couldn’t copy", "error"),
    );
  };

  const download = () => {
    const ticket = ticketRef.current;
    if (!ticket || !saveTicketPng(ticket, order, shopName)) {
      showPopup("Something went wrong. Try again.", "error");
      return;
    }
    setSaved(true);
    showPopup("Download started", "success");
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close bill" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-bill-title"
        className="relative flex max-h-[90vh] w-full max-w-[22rem] flex-col"
      >
        <div className="min-h-0 overflow-y-auto">
          <article
            ref={ticketRef}
            className="relative rounded-[1.25rem] bg-[#FDFBF7] px-5 pt-5 pb-6 text-[#1F1C18] shadow-[0_18px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/40"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full bg-white text-black shadow-sm ring-1 ring-black/5"
              aria-label="Close bill"
            >
              <X className="h-4 w-4" />
            </button>
            <p id="ticket-bill-title" className="px-8 text-center text-lg font-extrabold tracking-tight text-forest">
              {shopName}
            </p>
            <p className="mt-1 text-center text-[11px] font-semibold tracking-wide text-[#1F1C18]/55">
              {order.addressLabel}
            </p>
            <p className="mx-auto mt-0.5 max-w-[16rem] text-center text-[11px] leading-4 text-[#1F1C18]/70">
              {order.addressDetail}
            </p>
            <Dash />
            <Pair label="Bill" value={order.number} />
            <Pair label="Date" value={order.placedAtLabel} />
            <Pair label="Payment" value={order.paymentLabel} />
            <Dash />
            <div className="flex justify-between text-[10px] font-bold tracking-[0.14em] text-[#1F1C18]/45">
              <span>ITEM</span>
              <span>PRICE</span>
            </div>
            <ul className="mt-2 space-y-1.5 font-mono text-[13px]">
              {order.lines.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {line.isWeight ? orderLineLabel(line) : `${line.qty}×`} {lineName(line)}
                  </span>
                  <span className="shrink-0 tabular-nums">{inr(line.lineTotal)}</span>
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
            <div className="mt-2 flex justify-between gap-3 border-t border-[#1F1C18]/15 pt-2 text-forest">
              <span className="text-[13px] font-extrabold tracking-wide uppercase">Total</span>
              <span className="text-right text-[15px] font-extrabold tabular-nums">{inr(total)}</span>
            </div>
            {order.status === "delivered" ? (
              <div className="mt-5 flex justify-center">
                <PaidSeal />
              </div>
            ) : null}
            <p className="mt-3 text-center text-[11px] text-[#1F1C18]/55">
              Thank you for shopping with {shopName}
            </p>
            <BrandFooter className="pt-4 pb-0" />
          </article>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <BillAction onClick={copy} icon={<Copy className="h-3.5 w-3.5" aria-hidden />}>
            {copied ? "Copied" : "Copy"}
          </BillAction>
          <BillAction onClick={download} icon={<Download className="h-3.5 w-3.5" aria-hidden />}>
            {saved ? "Saved" : "Download"}
          </BillAction>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-full bg-track text-[13px] font-bold text-black"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function BillAction({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-full bg-white text-[13px] font-bold text-black ring-1 ring-[#E6E6EA]"
    >
      {icon}
      {children}
    </button>
  );
}

const YAADRO_MARK =
  "M12.65 1.19L47.35 1.49L56.38 3.30L63.84 5.99L69.29 8.71L74.66 12.29L79.51 16.23L83.77 20.49L89.50 28.02L94.01 36.46L96.70 43.92L98.21 50.56L98.81 55.63L98.81 65.26L98.21 70.34L97.00 75.78L94.61 82.95L89.79 92.28L85.26 98.32L79.22 104.37L76.23 106.75L71.68 109.79L65.93 112.82L58.17 115.50L50.63 117.01L47.05 117.31L13.54 117.31L8.99 116.10L6.23 114.57L4.29 112.95L1.81 109.22L1.19 107.05L1.25 51.96L10.04 52.24L16.08 53.45L21.46 55.24L25.41 57.07L32.28 61.25L37.43 65.49L41.14 69.51L41.49 72.13L40.26 73.41L36.60 73.73L23.99 73.43L22.50 74.51L22.39 90.93L23.69 92.24L37.20 92.24L42.87 91.34L47.13 90.13L51.90 88.04L56.75 85.02L61.68 80.71L64.72 77.05L66.81 73.77L70.13 65.93L71.64 57.80L71.64 34.74L71.23 33.92L70.11 33.15L55.34 33.13L54.44 33.62L54.03 34.44L54.03 42.57L53.73 43.10L54.03 51.23L53.68 52.28L52.57 53.38L50.26 53.43L37.95 43.94L31.98 40.35L26.83 37.93L20.56 35.54L14.81 34.03L9.74 33.13L1.38 32.72L1.49 12.05L2.41 8.69L3.94 5.63L6.23 3.34L8.40 2.11L12.57 1.21Z";

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function fitLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * PNG of the on-screen ticket at that card's width.
 * The total rule is drawn, then the amount is painted below it.
 */
function paintTicketPng(ticket: HTMLElement, order: SampleOrder, shopName: string): HTMLCanvasElement | null {
  const width = Math.max(280, Math.ceil(ticket.offsetWidth));
  const scale = 2;
  const font = getComputedStyle(ticket).fontFamily || "system-ui, sans-serif";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const ink = "#1F1C18";
  const forest = "#3d8f3d";
  const pad = 20;
  const scratch = document.createElement("canvas");
  scratch.width = width * scale;
  scratch.height = 1800 * scale;
  const ctx = scratch.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#FDFBF7";
  ctx.fillRect(0, 0, width, scratch.height / scale);

  let y = 22;
  ctx.fillStyle = forest;
  ctx.font = `800 18px ${font}`;
  ctx.textAlign = "center";
  ctx.fillText(shopName, width / 2, y);
  y += 26;

  ctx.fillStyle = "rgba(31,28,24,0.55)";
  ctx.font = `600 11px ${font}`;
  ctx.fillText(order.addressLabel, width / 2, y);
  y += 16;
  ctx.fillStyle = "rgba(31,28,24,0.7)";
  ctx.font = `400 11px ${font}`;
  for (const line of wrapLines(ctx, order.addressDetail, 256)) {
    ctx.fillText(line, width / 2, y);
    y += 15;
  }

  const dash = () => {
    y += 10;
    ctx.save();
    ctx.strokeStyle = "rgba(31,28,24,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    ctx.restore();
    y += 12;
  };
  const pair = (label: string, value: string) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(31,28,24,0.6)";
    ctx.font = `600 11px ${font}`;
    ctx.fillText(label.toUpperCase(), pad, y + 2);
    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.font = `500 15px ${font}`;
    ctx.fillText(value, width - pad, y);
    y += 22;
  };

  dash();
  pair("Bill", order.number);
  pair("Date", order.placedAtLabel);
  pair("Payment", order.paymentLabel);
  dash();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(31,28,24,0.45)";
  ctx.font = `700 10px ${font}`;
  ctx.fillText("ITEM", pad, y);
  ctx.textAlign = "right";
  ctx.fillText("PRICE", width - pad, y);
  y += 18;

  const charge = deliveryCharge(order);
  ctx.fillStyle = ink;
  ctx.font = `400 13px ${mono}`;
  for (const line of order.lines) {
    const label = `${line.isWeight ? orderLineLabel(line) : `${line.qty}×`} ${lineName(line)}`;
    const price = inr(line.lineTotal);
    const priceW = ctx.measureText(price).width;
    ctx.textAlign = "left";
    ctx.fillText(fitLine(ctx, label, width - pad * 2 - priceW - 12), pad, y);
    ctx.textAlign = "right";
    ctx.fillText(price, width - pad, y);
    y += 20;
  }

  dash();
  pair("Item total", inr(order.subtotal));
  if (order.promoDiscount > 0) {
    pair(
      order.promoCode ? `Coupon (${order.promoCode})` : "Promo",
      `−${inr(order.promoDiscount)}`,
    );
  }
  if (charge > 0) {
    pair("Delivery fee", inr(charge));
  }

  y += 8;
  ctx.strokeStyle = "rgba(31,28,24,0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  y += 10;
  ctx.fillStyle = forest;
  ctx.textAlign = "left";
  ctx.font = `800 13px ${font}`;
  ctx.fillText("TOTAL", pad, y);
  ctx.textAlign = "right";
  ctx.font = `800 15px ${font}`;
  ctx.fillText(inr(billedTotal(order)), width - pad, y);
  y += 22;

  if (order.status === "delivered") {
    y += 16;
    const size = 76;
    ctx.save();
    ctx.translate(width / 2, y + size / 2);
    ctx.rotate((-12 * Math.PI) / 180);
    ctx.scale(size / 100, size / 100);
    ctx.translate(-50, -50);
    const edge = new Path2D(PAID_SEAL_EDGE);
    ctx.fillStyle = "rgba(61,143,61,0.08)";
    ctx.fill(edge);
    ctx.strokeStyle = forest;
    ctx.lineWidth = 1.4;
    ctx.stroke(edge);
    ctx.beginPath();
    ctx.arc(50, 50, 31, 0, Math.PI * 2);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(50, 50, 27, 0, Math.PI * 2);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = forest;
    ctx.font = `800 13px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAID", 50, 52);
    ctx.restore();
    ctx.textBaseline = "top";
    y += size;
  }

  y += 14;
  ctx.fillStyle = "rgba(31,28,24,0.55)";
  ctx.font = `400 11px ${font}`;
  ctx.textAlign = "center";
  for (const line of wrapLines(ctx, `Thank you for shopping with ${shopName}`, width - pad * 2)) {
    ctx.fillText(line, width / 2, y);
    y += 15;
  }

  y += 18;
  const markH = 32;
  const markScale = markH / 118.51;
  const markW = 100 * markScale;
  ctx.font = `800 24px ${font}`;
  const word = "yaadro";
  const wordW = ctx.measureText(word).width;
  const gap = 8;
  const left = (width - (markW + gap + wordW)) / 2;
  ctx.save();
  ctx.translate(left, y);
  ctx.scale(markScale, markScale);
  ctx.fillStyle = "rgba(107,114,128,0.55)";
  ctx.fill(new Path2D(YAADRO_MARK));
  ctx.restore();
  ctx.fillStyle = "rgba(107,114,128,0.55)";
  ctx.font = `800 24px ${font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(word, left + markW + gap, y + markH / 2);
  y += markH + 24;

  const height = Math.ceil(y);
  const out = document.createElement("canvas");
  out.width = width * scale;
  out.height = height * scale;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(scratch, 0, 0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function saveTicketPng(ticket: HTMLElement, order: SampleOrder, shopName: string): boolean {
  const canvas = paintTicketPng(ticket, order, shopName);
  if (!canvas) return false;
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${shopName.replace(/[^\w]+/g, "-")}-${order.number}.png`;
  link.click();
  return true;
}


const PAID_SEAL_EDGE = (() => {
  const teeth = 32;
  const cx = 50;
  const cy = 50;
  const outer = 48;
  const inner = 43;
  let d = "";
  for (let i = 0; i < teeth; i += 1) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 0.5) / teeth) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + Math.cos(a0) * outer;
    const y0 = cy + Math.sin(a0) * outer;
    const x1 = cx + Math.cos(a1) * inner;
    const y1 = cy + Math.sin(a1) * inner;
    d += `${i === 0 ? "M" : "L"}${x0.toFixed(2)} ${y0.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)} `;
  }
  return `${d}Z`;
})();

/** Rubber-stamp seal in its own row under the total, clear of the amount. */
function PaidSeal() {
  return (
    <span className="block size-[4.75rem] -rotate-12 text-forest" aria-hidden>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d={PAID_SEAL_EDGE} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fill="currentColor"
          fontSize="13"
          fontWeight="800"
          letterSpacing="1.6"
        >
          PAID
        </text>
      </svg>
    </span>
  );
}

