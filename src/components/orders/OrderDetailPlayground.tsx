"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
} from "lucide-react";
import { BackButton } from "@/components/navigation/BackButton";
import { getOrder, listOrders } from "@/lib/api/orders";
import { getSampleProduct } from "@/lib/sample-products";
import {
  LeadAction,
  OrderReceiptDialog,
  OrderReviewSheet,
  OrderTicketBill,
  billedTotal,
  clockish,
  deliveryCharge,
  inr,
  leadProgress,
  leadStatusInk,
  leadStatusLabel,
  leadStepIndex,
  lineName,
} from "@/components/orders/lead-order-shared";
import {
  orderLineLabel,
  type SampleOrder,
  type SampleOrderLine,
} from "@/lib/sample-orders";
import { cn } from "@/lib/cn";

export type OrderDetailPlaygroundProps = {
  orderId?: string;
  backHref?: string;
  shopHref?: string;
  /** Centered ticket bill with download. On for storefront and playground. */
  ticketBill?: boolean;
  className?: string;
};

/**
 * Order detail layout. Used on `/orders/[id]` and in the playground.
 * Data from `getOrder()` sample façade.
 */
export function OrderDetailPlayground({
  orderId,
  backHref = "/playground/orders-list",
  shopHref = "/playground",
  ticketBill = true,
  className,
}: OrderDetailPlaygroundProps) {
  const order = orderId ? getOrder(orderId) : listOrders()[0];

  if (!order) {
    return (
      <div className={cn("flex min-h-full flex-col bg-white px-5", className)}>
        <div className="pt-3">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-bold text-forest">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Orders
          </Link>
        </div>
        <p className="py-16 text-center text-sm font-semibold text-muted">Order not found</p>
      </div>
    );
  }

  return (
    <OrderDetailBody
      order={order}
      backHref={backHref}
      shopHref={shopHref}
      ticketBill={ticketBill}
      className={className}
    />
  );
}

function OrderDetailBody({
  order,
  backHref,
  shopHref,
  ticketBill,
  className,
}: {
  order: SampleOrder;
  backHref: string;
  shopHref: string;
  ticketBill: boolean;
  className?: string;
}) {
  const [review, setReview] = useState(false);
  const [bill, setBill] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const progress = leadProgress(order.status);
  const cancelled = order.status === "cancelled";
  const delivered = progress === "delivered";
  const label = leadStatusLabel(progress, order.status);
  const placed = order.timeline.find((step) => step.key === "placed")?.at;
  const moving =
    order.timeline.find((step) => step.key === "out_for_delivery")?.at ??
    order.timeline.find((step) => step.key === "packed")?.at;
  const done = order.timeline.find((step) => step.key === "delivered")?.at;

  const copyId = () => {
    void navigator.clipboard?.writeText(order.number);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={cn("mx-auto min-h-full w-full max-w-lg bg-white", className)}>
      <header className="bg-forest px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 text-black">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <BackButton href={backHref} label="Back to orders" />
          <p className="text-center text-lg font-bold tracking-tight text-black">Order</p>
          <span />
        </div>
        <div className="flex items-center justify-center gap-1 pb-1">
          <p className="truncate text-base font-extrabold tracking-tight text-black">{order.number}</p>
          <button
            type="button"
            onClick={copyId}
            aria-label="Copy order id"
            className="grid h-8 w-8 cursor-pointer place-items-center text-black"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint">
            <DeliveryScooter className="h-8 w-8" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Order ID</p>
            <div className="flex items-center gap-1">
              <p className="truncate text-lg font-extrabold tracking-tight text-black">
                {order.number}
              </p>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copy order id"
                className="grid h-8 w-8 cursor-pointer place-items-center text-muted"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1.5 text-[13px] font-bold"
            style={{
              color: leadStatusInk(progress),
              backgroundColor:
                progress === "on_the_way"
                  ? "#E8F1FF"
                  : progress === "rejected"
                    ? "#FEE2E2"
                    : "#E3F5E3",
            }}
          >
            {label}
          </span>
        </div>
        {copied ? <p className="mt-1 text-xs font-semibold text-forest">Copied</p> : null}

        {cancelled ? (
          <div className="mt-7 text-center">
            <p className="text-[26px] leading-tight font-extrabold tracking-tight text-black">
              Order cancelled
            </p>
            <p className="mt-2 px-6 text-[15px] font-semibold text-muted">
              This order was cancelled and won’t be delivered.
            </p>
            {clockish(order.timeline.find((step) => step.key === "cancelled")?.at) ? (
              <p className="mt-2 text-[13px] font-semibold text-muted">
                {order.timeline.find((step) => step.key === "cancelled")?.at}
              </p>
            ) : null}
          </div>
        ) : (
          <DetailSteps
            active={leadStepIndex(progress)}
            times={[clockish(placed), clockish(moving), clockish(done)]}
          />
        )}

        <div className="mt-6 flex gap-2.5">
          {cancelled ? (
            <>
              <LeadAction
                label="Call shop"
                icon={<Phone className="h-4 w-4" aria-hidden />}
                onClick={() => setNote("Shop phone isn’t on this sample order.")}
              />
              <LeadAction
                label="Order again"
                filled
                href={shopHref}
                icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
              />
            </>
          ) : delivered ? (
            <>
              <LeadAction
                label="Review"
                icon={<Star className="h-4 w-4" aria-hidden />}
                onClick={() => setReview(true)}
              />
              <LeadAction
                label="Receipt"
                filled
                icon={<Download className="h-4 w-4" aria-hidden />}
                onClick={() => setBill(true)}
              />
            </>
          ) : (
            <LeadAction
              label="Track order"
              filled
              icon={<DeliveryScooter className="h-8 w-8" />}
              onClick={() => setNote("Live tracking isn’t connected on this preview.")}
            />
          )}
        </div>
        {note ? <p className="mt-3 text-center text-[13px] font-semibold text-muted">{note}</p> : null}

        <SectionTitle icon={<DeliveryScooter className="h-6 w-6" />} label="Delivery details" />
        <div className="mt-3 overflow-hidden rounded-3xl bg-[#F4F4F6]">
          <DetailRow label="Deliver to" value={order.addressLabel} />
          <DetailRow label="Address" value={order.addressDetail} />
          <DetailRow label="Payment" value={order.paymentLabel} />
        </div>

        <div className="mt-3.5 rounded-3xl bg-[#F4F4F6] px-4 py-4">
          <ul className="space-y-4">
            {order.lines.map((line) => (
              <BillLine key={line.productId} line={line} />
            ))}
          </ul>
          <div className="my-4 h-px bg-[#EAEAED]" />
          <Amount label="Subtotal" value={inr(order.subtotal)} />
          {order.promoDiscount > 0 ? (
            <Amount label="Promo" value={`−${inr(order.promoDiscount)}`} />
          ) : null}
          <Amount label="Shipping" value={inr(deliveryCharge(order))} />
          <div className="my-4 h-px bg-[#EAEAED]" />
          <Amount label="Total" value={inr(billedTotal(order))} strong />
        </div>

        <div className="mt-3.5 flex items-center gap-3 rounded-3xl bg-[#F4F4F6] p-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-mint">
            <Image
              src="/orders/delivery-partner.png"
              alt=""
              width={64}
              height={64}
              className="h-10 w-10 object-contain"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-black">
              {delivered || progress === "on_the_way" ? "Ravi Kumar" : "Delivery partner"}
            </p>
            <p className="text-[13px] font-medium text-muted">
              {delivered || progress === "on_the_way"
                ? "Bike · assigned for this drop"
                : "We’ll assign a partner when the order is on the way."}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E4E4E8] text-muted">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E4E4E8] text-forest">
            <Phone className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <div className="mt-3.5 rounded-3xl bg-[#F4F4F6] px-4 pt-4 pb-5">
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-black" />
          <ol className="relative space-y-5">
            {order.timeline.map((step, index) => {
              const failed = step.key === "cancelled";
              const last = index === order.timeline.length - 1;
              return (
                <li key={step.key} className="flex gap-3">
                  <div className="w-[4.5rem] shrink-0">
                    <p className="text-[15px] font-extrabold text-black">
                      {clockish(step.at) || "—"}
                    </p>
                  </div>
                  <div className="relative flex w-6 justify-center">
                    {!last ? (
                      <span className="absolute top-5 bottom-[-1.25rem] w-0.5 bg-black" />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 grid size-5 place-items-center rounded-full text-white",
                        failed ? "bg-red-600" : "bg-black",
                      )}
                    >
                      {failed ? (
                        <span className="text-[10px] font-bold">×</span>
                      ) : (
                        <Check className="h-3 w-3" aria-hidden />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-black">{step.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {review ? <OrderReviewSheet onClose={() => setReview(false)} /> : null}
      {bill ? (
        ticketBill ? (
          <OrderTicketBill order={order} onClose={() => setBill(false)} />
        ) : (
          <OrderReceiptDialog order={order} onClose={() => setBill(false)} />
        )
      ) : null}
    </div>
  );
}

function DetailSteps({ active, times }: { active: number; times: string[] }) {
  const labels = ["Placed", "On the way", "Delivered"];
  return (
    <div className="mt-7">
      <div className="relative flex">
        <div className="absolute top-3.5 right-[16.6%] left-[16.6%] flex">
          <span className={cn("h-[3px] flex-1 rounded-full", active > 0 ? "bg-[#22C55E]" : "bg-[#E6E6EA]")} />
          <span className={cn("h-[3px] flex-1 rounded-full", active > 1 ? "bg-[#22C55E]" : "bg-[#E6E6EA]")} />
        </div>
        {labels.map((label, index) => {
          const done = index < active || active >= 2;
          const current = index === active && active < 2;
          return (
            <div key={label} className="relative z-10 flex flex-1 flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full",
                  done && "bg-[#22C55E] text-white",
                  current && "bg-black text-white",
                  !done && !current && "bg-[#E4E4E8]",
                )}
              >
                {done || current ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              </span>
              <p className="mt-2 text-center text-[13px] font-bold text-black">{label}</p>
              {times[index] ? (
                <p className="text-center text-xs font-medium text-muted">{times[index]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeliveryScooter({ className }: { className?: string }) {
  return (
    <Image
      src="/orders/delivery-scooter.png"
      alt=""
      width={64}
      height={64}
      className={cn("object-contain", className)}
    />
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mt-7 flex items-center gap-2 text-muted">
      {icon}
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-[#EAEAED] px-4 py-3.5 last:border-b-0">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="min-w-0 flex-1 text-right text-sm font-bold text-black">{value}</p>
    </div>
  );
}

function BillLine({ line }: { line: SampleOrderLine }) {
  const product = getSampleProduct(line.productId);
  return (
    <li className="flex items-start gap-3">
      {product ? (
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white">
          <Image src={product.image} alt="" fill className="object-cover" sizes="40px" />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-black">{lineName(line)}</p>
        <span className="mt-0.5 rounded-full bg-track px-1.5 py-0.5 text-[10px] leading-none font-extrabold whitespace-nowrap text-black">
          {orderLineLabel(line, product?.unit)}
        </span>
      </div>
      <p className="text-sm font-bold text-black">{inr(line.lineTotal)}</p>
    </li>
  );
}

function Amount({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex justify-between", strong ? "text-base font-extrabold" : "mt-3 text-[15px] font-semibold")}>
      <span className="text-black">{label}</span>
      <span className="text-black">{value}</span>
    </div>
  );
}
