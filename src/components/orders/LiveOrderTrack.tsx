"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  MapPin,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { OrderTicketBill } from "@/components/orders/lead-order-shared";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { showPopup } from "@/components/ui/Toast";
import { getOrder, getOrderByNumber, listOrders } from "@/lib/api/orders";
import { cn } from "@/lib/cn";
import {
  liveHeaderActiveIndex,
  liveTrackSample,
  type LiveHeaderStep,
  type LiveOrderTrackSample,
  type LiveProgressStep,
  type LiveTrackPhase,
} from "@/lib/live-order-track";
import { buildLiveTrackEmbedUrl } from "@/lib/live-track-map";
import type { SampleOrder } from "@/lib/sample-orders";

type LiveOrderTrackProps = {
  /** Preview phase when `sample` is not provided. Default accepted. */
  phase?: LiveTrackPhase;
  /** Real / mapped order sample (ecom `/orders/[id]/track`). */
  sample?: LiveOrderTrackSample;
  /** Source order for the same ticket bill as order details. */
  order?: SampleOrder;
  /** Optional back control (e.g. order details). */
  backHref?: string;
  className?: string;
};

/** Resolve a real sample order for the ticket bill (same as order details). */
function resolveBillOrder(
  order: SampleOrder | undefined,
  sample: LiveOrderTrackSample,
): SampleOrder | undefined {
  if (order) return order;
  const byTracking =
    getOrderByNumber(sample.trackingId) ?? getOrderByNumber(sample.billNo);
  if (byTracking) return byTracking;
  if (sample.phase === "delivered") {
    return getOrder("ord-1038") ?? listOrders().find((o) => o.status === "delivered");
  }
  return (
    getOrder("ord-1042") ??
    listOrders().find((o) => o.status !== "cancelled")
  );
}

/**
 * Live order tracking UI (playground demo + ecom `/orders/[id]/track`).
 * Separate from classic order details. Live map uses Google Maps Embed when
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (Maps Embed API enabled).
 */
export function LiveOrderTrack({
  phase = "accepted",
  sample: sampleProp,
  order: orderProp,
  backHref,
  className,
}: LiveOrderTrackProps) {
  const sample = sampleProp ?? liveTrackSample(phase);
  const billOrder = useMemo(
    () => resolveBillOrder(orderProp, sample),
    [orderProp, sample],
  );
  /** Map / Live Track only after a partner is assigned on OFD. */
  const canLiveTrack =
    sample.phase === "out_for_delivery" && Boolean(sample.rider);
  /** Start with mascot; user opens Live Track for the map. */
  const [mapOpen, setMapOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const copyText = (value: string) => {
    if (!navigator.clipboard?.writeText) {
      showPopup("Couldn’t copy", "error");
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => showPopup("Copied", "success"),
      () => showPopup("Couldn’t copy", "error"),
    );
  };

  const openBill = () => {
    if (!billOrder) {
      showPopup("Bill isn’t available", "error");
      return;
    }
    setBillOpen(true);
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-lg bg-paper", className)}>
      <ShopHeader sample={sample} onCopy={copyText} backHref={backHref} />

      <div className="space-y-4 px-4 pt-4 pb-8">
        <TrackingCard
          sample={sample}
          canLiveTrack={canLiveTrack}
          mapOpen={canLiveTrack && mapOpen}
          onToggleMap={() => setMapOpen((v) => !v)}
        />

        <DeliveryDetails
          sample={sample}
          onCopy={copyText}
          onDownloadBill={openBill}
        />

        {sample.rider ? (
          <RiderCard
            rider={sample.rider}
            showCall={sample.phase !== "delivered"}
          />
        ) : sample.phase !== "delivered" ? (
          <AwaitingPartnerCard />
        ) : null}

        <OrderItems sample={sample} />

        <OrderProgressInline sample={sample} />

        <BrandFooter className="!pt-6 !pb-2" />
        <p className="pb-2 text-center text-[11px] leading-4 text-muted">
          Live order tracking preview for shops and customers.
        </p>
        <p className="pb-4 text-center text-[10px] font-semibold tracking-wide text-muted/70 uppercase">
          Powered by Codeteak
        </p>
      </div>

      {billOpen && billOrder ? (
        <OrderTicketBill order={billOrder} onClose={() => setBillOpen(false)} />
      ) : null}

      {sample.rider && sample.phase !== "delivered" ? (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-end px-4 pb-2">
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-leaf shadow-[0_8px_20px_rgba(47,107,47,0.2)] ring-1 ring-forest/15"
              aria-label="Open live map"
            >
              <MapPin className="h-5 w-5" aria-hidden />
            </button>
            <a
              href={`tel:${sample.rider.phone.replace(/\s+/g, "")}`}
              className="grid h-14 w-14 place-items-center rounded-full bg-track text-black shadow-[0_10px_24px_rgba(47,107,47,0.35)]"
              aria-label={`Call delivery partner ${sample.rider.name}`}
            >
              <Phone className="h-6 w-6" aria-hidden />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Playground frame — phase chips + same bill as ecom track / order details. */
export function LiveOrderTrackDemo() {
  /** Default Accepted: track page open, waiting for partner (no Live Track yet). */
  const [phase, setPhase] = useState<LiveTrackPhase>("accepted");
  /** Prefer OFD sample; delivered phase uses YAD-1038 for the ticket. */
  const demoOrder = useMemo(() => {
    if (phase === "delivered") return getOrder("ord-1038") ?? getOrder("ord-1042");
    return getOrder("ord-1042") ?? listOrders()[0];
  }, [phase]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 px-1">
        <PhaseChip
          label="Accepted"
          active={phase === "accepted"}
          onClick={() => setPhase("accepted")}
        />
        <PhaseChip
          label="Packed"
          active={phase === "packed"}
          onClick={() => setPhase("packed")}
        />
        <PhaseChip
          label="Out for Delivery"
          active={phase === "out_for_delivery"}
          onClick={() => setPhase("out_for_delivery")}
        />
        <PhaseChip
          label="Delivered"
          active={phase === "delivered"}
          onClick={() => setPhase("delivered")}
        />
      </div>
      <p className="px-1 text-[12px] font-semibold leading-snug text-muted">
        Accepted / Packed: waiting for partner. Out for delivery: Live Track.
        Download Bill matches order details.
      </p>
      <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-paper shadow-[0_16px_40px_rgba(6,78,59,0.12)] ring-1 ring-forest/10">
        <LiveOrderTrack key={phase} phase={phase} order={demoOrder} />
      </div>
    </div>
  );
}

function PhaseChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
        active
          ? "bg-track text-black"
          : "bg-white text-forest ring-1 ring-forest/15 hover:bg-mint/50",
      )}
    >
      {label}
    </button>
  );
}

function ShopHeader({
  sample,
  onCopy,
  backHref,
}: {
  sample: LiveOrderTrackSample;
  onCopy: (v: string) => void;
  backHref?: string;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-forest/10 bg-white px-4 py-3">
      {backHref ? (
        <BackButton href={backHref} label="Back to order" />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-track text-[15px] font-extrabold text-black">
          Y
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold text-black">
          {sample.shopName}
        </p>
        <div className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-muted">
          <span>Bill No: {sample.billNo}</span>
          <button
            type="button"
            onClick={() => onCopy(sample.billNo)}
            aria-label="Copy bill number"
            className="grid h-6 w-6 place-items-center text-forest"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

function TrackingCard({
  sample,
  canLiveTrack,
  mapOpen,
  onToggleMap,
}: {
  sample: LiveOrderTrackSample;
  canLiveTrack: boolean;
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const active = liveHeaderActiveIndex(sample);

  return (
    <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-forest/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide text-muted uppercase">
            Tracking ID
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <p className="truncate text-[15px] font-extrabold text-black">
              {sample.trackingId}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-mint px-3 py-1.5 text-[12px] font-extrabold text-forest">
          {sample.statusBadge}
        </span>
      </div>

      <HeaderStepper steps={sample.headerSteps} activeIndex={active} />

      {canLiveTrack && mapOpen ? (
        <LiveTrackMapPanel sample={sample} />
      ) : sample.phase === "accepted" ? (
        <StatusMascotArt
          src="/orders/live-track/order-accepted.png"
          message={sample.statusMessage}
          imgClassName="h-[15.5rem]"
        />
      ) : sample.phase === "packed" ? (
        <StatusMascotArt
          src="/orders/live-track/packed.png"
          message={sample.statusMessage}
          imgClassName="h-[15rem]"
        />
      ) : sample.phase === "delivered" ? (
        <StatusMascotArt
          src="/orders/live-track/delivered.png"
          message={sample.statusMessage}
          imgClassName="h-[15.5rem]"
        />
      ) : sample.phase === "out_for_delivery" ? (
        <StatusMascotArt
          src="/orders/live-track/out-for-delivery.png"
          message={sample.statusMessage}
          imgClassName="h-[15rem]"
          wide
        />
      ) : null}

      {canLiveTrack ? (
        <button
          type="button"
          onClick={onToggleMap}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-track text-[14px] font-extrabold text-black shadow-[0_8px_20px_rgba(47,107,47,0.25)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          {mapOpen ? "Hide Live Track" : "Live Track"}
        </button>
      ) : null}
    </section>
  );
}

function HeaderStepper({
  steps,
  activeIndex,
}: {
  steps: LiveHeaderStep[];
  activeIndex: number;
}) {
  return (
    <ol className="mt-5 grid grid-cols-3 gap-1">
      {steps.map((step, i) => {
        const done = i <= activeIndex;
        return (
          <li key={step.id} className="relative flex flex-col items-center">
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "absolute top-[0.85rem] left-[calc(50%+0.85rem)] h-0.5 w-[calc(100%-1.7rem)]",
                  i < activeIndex ? "bg-leaf" : "bg-forest/15",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] grid h-7 w-7 place-items-center rounded-full",
                done ? "bg-leaf text-white" : "bg-forest/10 text-transparent",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </span>
            <p
              className={cn(
                "mt-2 text-center text-[11px] font-bold",
                done ? "text-forest" : "text-muted",
              )}
            >
              {step.label}
            </p>
            {step.at ? (
              <p className="text-[10px] font-semibold text-muted">{step.at}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Status mascot — open on page (no card/box), transparent PNG + caption. */
function StatusMascotArt({
  src,
  message,
  imgClassName,
  wide,
}: {
  src: string;
  message: string;
  imgClassName?: string;
  wide?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 px-1 pt-1 pb-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={wide ? 560 : 480}
        height={wide ? 420 : 480}
        className={cn(
          "w-auto max-w-full object-contain",
          imgClassName ?? "h-[15rem]",
        )}
        draggable={false}
      />
      <p
        role="status"
        className="max-w-[18rem] text-center text-[14px] leading-snug font-extrabold text-forest"
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Live map slot. Renders Google Maps Embed directions when
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise an API-needed state.
 */
function LiveTrackMapPanel({ sample }: { sample: LiveOrderTrackSample }) {
  const embedUrl = useMemo(
    () =>
      buildLiveTrackEmbedUrl({
        origin: sample.mapOrigin,
        destination: sample.mapDestination,
      }),
    [sample.mapOrigin, sample.mapDestination],
  );

  if (!embedUrl) {
    return (
      <div
        className="mt-4 flex min-h-[11.5rem] flex-col items-center justify-center gap-2 rounded-2xl bg-[#eef6ee] px-5 py-8 text-center ring-1 ring-forest/10"
        role="status"
      >
        <MapPin className="h-7 w-7 text-leaf" aria-hidden />
        <p className="text-[14px] font-extrabold text-forest">
          Map API not configured
        </p>
        <p className="max-w-[18rem] text-[12px] leading-5 text-muted">
          Set <code className="font-semibold text-ink">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          and enable the <span className="font-semibold text-ink">Maps Embed API</span>{" "}
          on that key. Same env var as address detect.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl ring-1 ring-forest/10">
      <iframe
        title="Live delivery map"
        src={embedUrl}
        className="h-[11.5rem] w-full border-0 bg-[#eef6ee]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

function DeliveryDetails({
  sample,
  onCopy,
  onDownloadBill,
}: {
  sample: LiveOrderTrackSample;
  onCopy: (v: string) => void;
  onDownloadBill: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-black">
          Delivery Details
        </h2>
        <button
          type="button"
          onClick={onDownloadBill}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-track px-3.5 text-[12px] font-extrabold text-black shadow-[0_6px_16px_rgba(47,107,47,0.22)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Download Bill
        </button>
      </div>
      <dl className="mt-3 space-y-3 rounded-[1.35rem] bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(47,107,47,0.06)] ring-1 ring-forest/8">
        <DetailRow label="Receiver" value={sample.receiver} />
        <DetailRow label="Contact" value={sample.contact} />
        <DetailRow label="Item" value={`${sample.itemCount} items`} />
        <DetailRow label="Amount" value={`₹${sample.amount}`} />
        <div className="flex items-center justify-between gap-3 border-t border-forest/8 pt-3">
          <dt className="text-[13px] font-semibold text-muted">Shop Contact</dt>
          <dd className="flex items-center gap-2">
            <a
              href={`tel:${sample.shopContact}`}
              className="grid h-9 w-9 place-items-center rounded-full bg-track text-black"
              aria-label="Call shop"
            >
              <Phone className="h-4 w-4" aria-hidden />
            </a>
            <span className="text-[13px] font-bold text-black">
              {sample.shopContact}
            </span>
            <button
              type="button"
              onClick={() => onCopy(sample.shopContact)}
              aria-label="Copy shop contact"
              className="grid h-7 w-7 place-items-center text-forest"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
            </button>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="text-right text-[13px] font-bold text-black">{value}</dd>
    </div>
  );
}

function AwaitingPartnerCard() {
  return (
    <div
      className="flex items-center gap-3 rounded-[1.35rem] bg-white p-3.5 shadow-[0_6px_18px_rgba(47,107,47,0.06)] ring-1 ring-forest/8"
      role="status"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint text-[16px] font-extrabold text-forest">
        ?
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-black">Delivery partner</p>
        <p className="text-[12px] font-semibold leading-snug text-muted">
          You can live-track this order when the shop assigns a partner.
        </p>
      </div>
    </div>
  );
}

function RiderCard({
  rider,
  showCall = true,
}: {
  rider: { name: string; initial: string; phone: string };
  /** After delivery, keep the name but hide call / phone number. */
  showCall?: boolean;
}) {
  const tel = rider.phone.replace(/\s+/g, "");
  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] bg-white p-3.5 shadow-[0_6px_18px_rgba(47,107,47,0.06)] ring-1 ring-forest/8">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint text-[16px] font-extrabold text-forest">
        {rider.initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold text-black">
          {rider.name}
        </p>
        <p className="text-[12px] font-semibold text-muted">Delivery partner</p>
      </div>
      {showCall ? (
        <a
          href={`tel:${tel}`}
          className="grid h-11 w-11 place-items-center rounded-full bg-track text-black"
          aria-label={`Call delivery partner ${rider.name}`}
        >
          <Phone className="h-5 w-5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function OrderItems({ sample }: { sample: LiveOrderTrackSample }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-black">
        <ShoppingBag className="h-4 w-4 text-leaf" aria-hidden />
        Order Items
      </h2>
      <ul className="mt-3 divide-y divide-forest/8 overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-forest/8">
        {sample.lines.map((line, index) => (
          <li
            key={`${line.name}-${line.qtyLabel ?? line.qty}-${line.price}-${index}`}
            className="flex items-start justify-between gap-3 px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold tracking-tight text-black uppercase">
                {line.name}
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-muted">
                Qty: {line.qtyLabel ?? line.qty}
              </p>
            </div>
            <p className="shrink-0 text-[14px] font-extrabold text-forest">
              ₹{line.price}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderProgressInline({ sample }: { sample: LiveOrderTrackSample }) {
  return (
    <section className="rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_6px_18px_rgba(47,107,47,0.06)] ring-1 ring-forest/8">
      <h2 className="text-[16px] font-extrabold text-forest">Order Progress</h2>
      <ol className="mt-4 space-y-0">
        {sample.progress.map((step, i) => (
          <ProgressRow
            key={step.id}
            step={step}
            isLast={i === sample.progress.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

function ProgressRow({
  step,
  isLast,
}: {
  step: LiveProgressStep;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex w-6 flex-col items-center">
        <span
          className={cn(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
            step.done ? "bg-leaf text-white" : "bg-forest/10 text-transparent",
          )}
        >
          {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
        {!isLast ? (
          <span
            className={cn(
              "my-1 w-0.5 flex-1 min-h-[1.75rem]",
              step.done ? "bg-leaf" : "border-l border-dashed border-forest/25",
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p
            className={cn(
              "text-[14px] font-extrabold",
              step.done ? "text-black" : "text-muted",
            )}
          >
            {step.label}
          </p>
          {step.at ? (
            <p className="text-[11px] font-semibold text-muted">{step.at}</p>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-0.5 text-[12px] font-medium",
            step.done ? "text-forest" : "text-muted",
          )}
        >
          {step.detail}
        </p>
      </div>
    </li>
  );
}
