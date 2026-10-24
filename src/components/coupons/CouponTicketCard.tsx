"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { CouponStatus, SampleCoupon } from "@/lib/sample-coupons";

/** Stable palette — pick by coupon id so SSR/hydration match (not Math.random). */
const TONES = [
  { stub: "#2f6b2f", soft: "#fff9e8", ink: "#1a3d1a" },
  { stub: "#ff7a45", soft: "#fff9e5", ink: "#c45c26" },
  { stub: "#1d6b8a", soft: "#f4fafc", ink: "#0d3d52" },
  { stub: "#6a32e1", soft: "#faf7ff", ink: "#4c1d95" },
  { stub: "#dc2626", soft: "#fff5f5", ink: "#991b1b" },
  { stub: "#0f766e", soft: "#f0fdfa", ink: "#115e59" },
  { stub: "#ca8a04", soft: "#fffbeb", ink: "#854d0e" },
  { stub: "#db2777", soft: "#fdf2f8", ink: "#9d174d" },
] as const;

const TICKET_W = 360;
const TICKET_H = 128;
const STUB_X = 58;

export function couponTicketTone(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

export function couponDiscountHeadline(coupon: SampleCoupon): string {
  if (coupon.discount.type === "percent") {
    return `${coupon.discount.percent}% OFF`;
  }
  return `₹${coupon.discount.amount} OFF`;
}

/** Distinct themes for Active / Used / Expired on ticket + sheet. */
export function ticketStatusChip(status: CouponStatus): {
  label: string;
  className: string;
} {
  if (status === "active") {
    return {
      label: "Active",
      className:
        "bg-forest text-white shadow-[0_2px_0_0_#1a4d1a] ring-2 ring-mint",
    };
  }
  if (status === "used") {
    return {
      label: "Used",
      className:
        "bg-slate-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-slate-600/40",
    };
  }
  return {
    label: "Expired",
    className:
      "bg-red-50 text-red-700 ring-2 ring-dashed ring-red-400/80",
  };
}

/** SVG mask: left bite, junction notches, serrated right edge. */
function ticketMaskDataUri() {
  const scallops: string[] = [];
  for (let y = 18; y <= TICKET_H - 18; y += 12) {
    scallops.push(
      `<circle cx="${TICKET_W - 2}" cy="${y}" r="5.5" fill="black"/>`,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TICKET_W} ${TICKET_H}">
    <rect width="${TICKET_W}" height="${TICKET_H}" fill="black"/>
    <rect x="2" y="4" width="${TICKET_W - 4}" height="${TICKET_H - 8}" rx="10" fill="white"/>
    <circle cx="2" cy="${TICKET_H / 2}" r="14" fill="black"/>
    <circle cx="${STUB_X}" cy="4" r="9" fill="black"/>
    <circle cx="${STUB_X}" cy="${TICKET_H - 4}" r="9" fill="black"/>
    ${scallops.join("")}
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const TICKET_MASK = ticketMaskDataUri();

type CouponTicketCardProps = {
  coupon: SampleCoupon;
  onClick: () => void;
};

/**
 * Ticket coupon matching reference silhouette: left bite, junction notches,
 * serrated right edge, floating drop-shadow. Click → details + copy.
 */
export function CouponTicketCard({ coupon, onClick }: CouponTicketCardProps) {
  const tone = couponTicketTone(coupon.id);
  const muted = coupon.status !== "active";
  const stub = muted ? "#9ca3af" : tone.stub;
  const soft = muted ? "#f3f4f6" : tone.soft;
  const ink = muted ? "#6b7280" : tone.ink;
  const headline = couponDiscountHeadline(coupon);
  const statusChip = ticketStatusChip(coupon.status);

  return (
    <div
      className={cn(
        "relative w-full",
        // Drop-shadow follows the masked silhouette
        "[filter:drop-shadow(0_8px_6px_rgba(0,0,0,0.1))_drop-shadow(0_16px_24px_rgba(0,0,0,0.16))]",
        muted && "opacity-90",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`${coupon.title}, ${headline}. Open details.`}
        className="relative flex w-full cursor-pointer text-left [mask-mode:luminance] [-webkit-mask-source-type:luminance] transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
        style={
          {
            WebkitMaskImage: TICKET_MASK,
            maskImage: TICKET_MASK,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            aspectRatio: `${TICKET_W} / ${TICKET_H}`,
          } as CSSProperties
        }
      >
        {/* Stub */}
        <span
          className="relative flex w-[16%] shrink-0 flex-col items-center justify-center"
          style={{ backgroundColor: stub }}
          aria-hidden
        >
          <span
            className="border border-dashed border-white/85 px-1 py-2.5 text-[10px] font-extrabold tracking-[0.22em] text-white uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Coupon
          </span>
        </span>

        {/* Dashed perforation at stub | body */}
        <span
          className="absolute top-[14%] bottom-[14%] z-10 w-0 border-l border-dashed"
          style={{ left: "16%", borderColor: `${stub}aa` }}
          aria-hidden
        />

        {/* Cream body */}
        <span
          className="relative flex min-w-0 flex-1 flex-col justify-between px-3.5 py-3 pr-5"
          style={{ backgroundColor: soft }}
        >
          <span className="flex items-start justify-between gap-2">
            <span
              className="text-[1.65rem] leading-none font-extrabold tracking-tight"
              style={{ color: ink }}
            >
              {headline}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase",
                statusChip.className,
              )}
            >
              {statusChip.label}
            </span>
          </span>

          <span
            className="my-1.5 border-t border-b border-dashed py-1.5"
            style={{ borderColor: `${stub}55` }}
          >
            <span className="block truncate text-[13px] font-bold text-ink">
              {coupon.title}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">
              {coupon.subtitle}
            </span>
          </span>

          <span className="flex items-end justify-between gap-2">
            <span
              className="max-w-[55%] truncate rounded-md px-2 py-1 text-[9px] font-semibold text-white"
              style={{ backgroundColor: stub }}
            >
              {coupon.validUntilLabel}
            </span>
            <span className="min-w-0 text-right">
              <span
                className="block text-[8px] font-bold tracking-[0.14em] uppercase"
                style={{ color: ink }}
              >
                Redeem code
              </span>
              <span
                className="block truncate font-mono text-[12px] font-extrabold tracking-wider"
                style={{ color: ink }}
              >
                {coupon.code}
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
