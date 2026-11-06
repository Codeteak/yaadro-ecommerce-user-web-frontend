"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, MapPin, Star, X } from "lucide-react";
import { getSampleProduct } from "@/lib/sample-products";
import {
  orderLineLabel,
  type OrderStatus,
  type SampleOrder,
  type SampleOrderLine,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

/**
 * Playground port of the lead’s order-history card, review sheet, and bill.
 * Brand orange from the Flutter app is Yaadro green (`track` / `forest`).
 */

const DETAILS_W = 118;
const DETAILS_H = 44;
const CUT_GAP = 8;
const CARD_R = 22;
const OPEN_R = 22;

export type LeadProgress = "placed" | "on_the_way" | "delivered" | "rejected";

export function leadProgress(status: OrderStatus): LeadProgress {
  if (status === "cancelled") return "rejected";
  if (status === "delivered") return "delivered";
  if (status === "out_for_delivery" || status === "packed") return "on_the_way";
  return "placed";
}

export function leadStepIndex(progress: LeadProgress): number {
  if (progress === "placed") return 0;
  if (progress === "on_the_way") return 1;
  return 2;
}

export function leadStatusLabel(progress: LeadProgress, status: OrderStatus): string {
  if (progress === "placed") return "Order placed";
  if (progress === "on_the_way") return "On the way";
  if (progress === "delivered") return "Delivered";
  return status === "cancelled" ? "Cancelled" : "Rejected";
}

export function leadStatusInk(progress: LeadProgress): string {
  if (progress === "on_the_way") return "#2563EB";
  if (progress === "rejected") return "#DC2626";
  return "#3d8f3d";
}

export function inr(amount: number): string {
  return `₹${Math.round(amount)}`;
}

export function orderItemCount(order: SampleOrder): number {
  return order.lines.reduce((n, line) => n + (line.isWeight ? 1 : line.qty), 0);
}

export function lineName(line: SampleOrderLine): string {
  return getSampleProduct(line.productId)?.name ?? "Item";
}

/** Sample delivery fee until an orders API returns one. */
export function deliveryCharge(order: SampleOrder): number {
  return order.status === "cancelled" ? 0 : 25;
}

export function billedTotal(order: SampleOrder): number {
  return order.totalDue + deliveryCharge(order);
}

export function clockish(at?: string): string {
  if (!at) return "";
  const parts = at.split("·");
  return (parts[1] ?? parts[0]).trim();
}

function cardClip(w: number, h: number): string | undefined {
  const btnR = DETAILS_H / 2;
  const innerR = btnR + CUT_GAP;
  const shoulderY = h - DETAILS_H - CUT_GAP;
  const cutTop = shoulderY - OPEN_R;
  if (w < 8 || h < 8 || cutTop <= CARD_R || w <= DETAILS_W + CUT_GAP + OPEN_R + CARD_R) {
    return undefined;
  }
  const innerCx = w - DETAILS_W + btnR;
  const innerCy = h - DETAILS_H + btnR;
  const sideX = w - DETAILS_W - CUT_GAP;
  return `path('M ${CARD_R} 0 L ${w - CARD_R} 0 A ${CARD_R} ${CARD_R} 0 0 1 ${w} ${CARD_R} L ${w} ${cutTop} A ${OPEN_R} ${OPEN_R} 0 0 1 ${w - OPEN_R} ${shoulderY} L ${innerCx} ${shoulderY} A ${innerR} ${innerR} 0 0 0 ${sideX} ${innerCy} L ${sideX} ${h - OPEN_R} A ${OPEN_R} ${OPEN_R} 0 0 1 ${sideX - OPEN_R} ${h} L ${CARD_R} ${h} A ${CARD_R} ${CARD_R} 0 0 1 0 ${h - CARD_R} L 0 ${CARD_R} A ${CARD_R} ${CARD_R} 0 0 1 ${CARD_R} 0 Z')`;
}

function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function OrderHistoryCard({
  order,
  href,
  onReview,
  onDownloadBill,
}: {
  order: SampleOrder;
  href: string;
  onReview: () => void;
  onDownloadBill: () => void;
}) {
  const [ref, box] = useBoxSize<HTMLDivElement>();
  const progress = leadProgress(order.status);
  const delivered = progress === "delivered";
  const cancelled = order.status === "cancelled";
  const tracking = progress === "placed" || progress === "on_the_way" || cancelled;
  const count = orderItemCount(order);
  const meta = [order.placedAtLabel, count === 1 ? "1 item" : `${count} items`].join(" · ");
  const clip = cardClip(box.w, box.h);
  const inset = { paddingRight: DETAILS_W + CUT_GAP };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="bg-[#F4F4F6]"
        style={{ borderRadius: clip ? undefined : CARD_R, clipPath: clip }}
      >
        <Link
          href={href}
          className="block px-4 pt-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-black" aria-hidden />
              <p className="truncate text-[15px] leading-tight font-bold tracking-tight text-black">
                {order.addressLabel}
                {order.addressDetail ? ` · ${order.addressDetail}` : ""}
              </p>
            </div>
            <div className="max-w-[50%] shrink-0 text-right">
              <p className="truncate text-xs font-medium text-muted">{meta}</p>
              <p className="mt-1 text-[13px] font-bold" style={{ color: leadStatusInk(progress) }}>
                {leadStatusLabel(progress, order.status)}
              </p>
            </div>
          </div>

          {order.lines.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {order.lines.map((line) => (
                <li
                  key={`${order.id}-${line.productId}`}
                  className="truncate text-[13px] font-medium text-muted"
                >
                  {line.isWeight ? orderLineLabel(line) : `${line.qty} ×`} {lineName(line)}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-2 text-[15px] font-extrabold text-black" style={inset}>
            {inr(billedTotal(order))}
          </p>

          {tracking ? (
            <div className="mt-2.5 pb-4" style={inset}>
              <HistorySteps
                active={cancelled ? 2 : leadStepIndex(progress)}
                cancelled={cancelled}
              />
            </div>
          ) : (
            <div className="h-4" />
          )}
        </Link>

        {delivered ? (
          <div className="px-4 pb-4" style={inset}>
            <button
              type="button"
              onClick={onDownloadBill}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-forest underline decoration-forest"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download bill
            </button>
          </div>
        ) : null}
      </div>

      {delivered ? (
        <button
          type="button"
          onClick={onReview}
          className="absolute right-0 bottom-0 inline-flex h-11 w-[118px] cursor-pointer items-center justify-center gap-1 rounded-full border-[1.4px] border-[#E6E6EA] bg-white text-[13px] font-bold text-black"
        >
          <Star className="h-4 w-4 fill-black" aria-hidden />
          Review
        </button>
      ) : (
        <Link
          href={href}
          className="absolute right-0 bottom-0 inline-flex h-11 w-[118px] items-center justify-center gap-1 rounded-full bg-track text-[13px] font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.25)]"
        >
          Details
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function HistorySteps({ active, cancelled }: { active: number; cancelled: boolean }) {
  const labels = ["Placed", "On the way", cancelled ? "Cancelled" : "Delivered"];
  return (
    <div>
      <div className="flex h-2 items-center">
        <Dot filled={active > 0} current={!cancelled && active === 0} />
        <Bar done={active > 0} />
        <Dot filled={active >= 1} current={!cancelled && active === 1} />
        <Bar done={active > 1} alert={cancelled} />
        <Dot filled={cancelled || active >= 2} alert={cancelled} />
      </div>
      <div className="mt-1.5 flex">
        {labels.map((label, i) => (
          <span
            key={label}
            className={cn(
              "min-w-0 flex-1 truncate text-[10px] font-semibold",
              i === 0 ? "text-left" : i === labels.length - 1 ? "text-right" : "text-center",
            )}
            style={{
              color:
                cancelled && i === labels.length - 1
                  ? "#DC2626"
                  : i < active
                    ? "#16A34A"
                    : i === active
                      ? "#171717"
                      : "#8E8E93",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Dot({
  filled,
  current,
  alert,
}: {
  filled?: boolean;
  current?: boolean;
  alert?: boolean;
}) {
  const color = alert ? "#DC2626" : current ? "#171717" : filled ? "#22C55E" : "#D4D4D8";
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

function Bar({ done, alert }: { done?: boolean; alert?: boolean }) {
  return (
    <span
      className="mx-1 h-0.5 flex-1 rounded-full"
      style={{ backgroundColor: alert ? "#DC2626" : done ? "#22C55E" : "#D4D4D8" }}
    />
  );
}

const REVIEW_COPY = [
  ["Poor", "Sorry it missed the mark."],
  ["Fair", "We’ll do better next time."],
  ["Good", "Glad it landed well."],
  ["Great", "Thanks — that means a lot."],
  ["Superb", "You made our day."],
] as const;

export function OrderReviewSheet({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(3);
  const [thanks, setThanks] = useState(false);
  const copy = REVIEW_COPY[rating - 1] ?? REVIEW_COPY[2];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close review" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-review-title"
        className="relative w-full max-w-lg rounded-t-[28px] bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-[#E6E6EA]" />
        <h2 id="order-review-title" className="mt-4 text-center text-lg font-extrabold text-black">
          Rate this order
        </h2>
        <div className="mt-4 flex justify-center gap-1">
          {REVIEW_COPY.map((_, i) => {
            const value = i + 1;
            const on = value <= rating;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                className="grid h-12 w-12 cursor-pointer place-items-center"
              >
                <Star
                  className={cn("h-9 w-9", on ? "fill-[#F5B400] text-[#F5B400]" : "text-[#52525B]")}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-base font-extrabold text-black">{copy[0]}</p>
        <p className="mt-1 text-center text-[13px] font-medium text-muted">{copy[1]}</p>
        <button
          type="button"
          onClick={() => {
            setThanks(true);
            window.setTimeout(onClose, 700);
          }}
          className="mt-4 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-track text-[15px] font-bold text-black"
        >
          <Star className="h-4 w-4" aria-hidden />
          {thanks ? "Thanks for the review" : "Submit review"}
        </button>
      </div>
    </div>
  );
}

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
    `Subtotal  ${inr(order.subtotal)}`,
    `Shipping  ${inr(charge)}`,
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
            <Pair label="Subtotal" value={inr(order.subtotal)} />
            <Pair label="Shipping" value={inr(charge)} />
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
              void navigator.clipboard?.writeText(text);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
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
  const charge = deliveryCharge(order);
  const total = billedTotal(order);
  const text = billPlainText(order);

  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    downloadBillPng(order);
    setSaved(true);
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
          <article className="relative rounded-[1.25rem] bg-[#FDFBF7] px-5 pt-5 pb-6 text-[#1F1C18] shadow-[0_18px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/40">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full bg-white text-black shadow-sm ring-1 ring-black/5"
              aria-label="Close bill"
            >
              <X className="h-4 w-4" />
            </button>
            <p id="ticket-bill-title" className="text-center text-[15px] font-extrabold tracking-[0.18em] text-forest">
              YAADRO
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
            <Pair label="Subtotal" value={inr(order.subtotal)} />
            {order.promoDiscount > 0 ? (
              <Pair label={order.promoCode ? `Promo ${order.promoCode}` : "Promo"} value={`−${inr(order.promoDiscount)}`} />
            ) : null}
            <Pair label="Shipping" value={inr(charge)} />
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
              Thank you for shopping with Yaadro
            </p>
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

function billPlainText(order: SampleOrder): string {
  const charge = deliveryCharge(order);
  return [
    "YAADRO",
    order.addressDetail,
    `Bill  ${order.number}`,
    `Date  ${order.placedAtLabel}`,
    `Payment  ${order.paymentLabel}`,
    "",
    ...order.lines.map(
      (line) =>
        `${line.isWeight ? orderLineLabel(line) : `${line.qty}×`} ${lineName(line)}  ${inr(line.lineTotal)}`,
    ),
    "",
    `Subtotal  ${inr(order.subtotal)}`,
    ...(order.promoDiscount > 0 ? [`Promo  −${inr(order.promoDiscount)}`] : []),
    `Shipping  ${inr(charge)}`,
    `Total  ${inr(billedTotal(order))}`,
  ].join("\n");
}

function downloadBillPng(order: SampleOrder) {
  const charge = deliveryCharge(order);
  const total = billedTotal(order);
  const rows: [string, string][] = [
    ["Bill", order.number],
    ["Date", order.placedAtLabel],
    ["Payment", order.paymentLabel],
    ...order.lines.map(
      (line) =>
        [
          `${line.isWeight ? orderLineLabel(line) : `${line.qty}×`} ${lineName(line)}`,
          inr(line.lineTotal),
        ] as [string, string],
    ),
    ["Subtotal", inr(order.subtotal)],
    ...(order.promoDiscount > 0
      ? [[order.promoCode ? `Promo ${order.promoCode}` : "Promo", `−${inr(order.promoDiscount)}`] as [string, string]]
      : []),
    ["Shipping", inr(charge)],
    ["Total", inr(total)],
  ];
  const width = 720;
  const height = 220 + rows.length * 36;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#FDFBF7";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#3d8f3d";
  ctx.font = "700 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("YAADRO", width / 2, 56);
  ctx.fillStyle = "#1F1C18";
  ctx.font = "500 16px sans-serif";
  ctx.fillText(order.addressDetail, width / 2, 88);
  ctx.textAlign = "left";
  ctx.font = "600 18px sans-serif";
  rows.forEach(([label, value], index) => {
    const y = 140 + index * 36;
    const strong = label === "Total";
    ctx.font = strong ? "800 22px sans-serif" : "600 18px sans-serif";
    ctx.fillStyle = strong ? "#3d8f3d" : "#1F1C18";
    ctx.textAlign = "left";
    ctx.fillText(label, 48, y);
    ctx.textAlign = "right";
    ctx.fillText(value, width - 48, y);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#1F1C1888";
  ctx.font = "500 14px sans-serif";
  ctx.fillText("Thank you for shopping with Yaadro", width / 2, height - 36);

  const save = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `Yaadro-${order.number}.png`;
    link.click();
  };
  canvas.toBlob((blob) => {
    if (!blob) {
      save(canvas.toDataURL("image/png"));
      return;
    }
    const url = URL.createObjectURL(blob);
    save(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
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

function Dash() {
  return <div className="my-2.5 border-t border-dashed border-[#1F1C18]/25" />;
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-[11px] tracking-wide text-[#1F1C18]/60 uppercase">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function LeadAction({
  label,
  icon,
  filled,
  onClick,
  href,
}: {
  label: string;
  icon: ReactNode;
  filled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-bold",
    filled
      ? "bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.28)]"
      : "bg-white text-black ring-[1.4px] ring-[#E6E6EA]",
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        <span className="truncate">{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(className, "cursor-pointer")}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
