"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, MapPin, Star } from "lucide-react";
import { orderLineLabel, type SampleOrder } from "@/lib/sample-orders";
import { cn } from "@/lib/cn";
import {
  billedTotal,
  inr,
  leadProgress,
  leadStatusInk,
  leadStatusLabel,
  leadStepIndex,
  lineName,
  orderItemCount,
} from "@/components/orders/lead-order-format";

const DETAILS_W = 118;
const DETAILS_H = 44;
const CUT_GAP = 8;
const CARD_R = 22;
const OPEN_R = 22;

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
