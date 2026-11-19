"use client";

import { mapCustomerOrder } from "@/lib/api/map-customer-order";
import { billedTotal, deliveryCharge } from "@/lib/orders-bill";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className={strong ? "font-extrabold text-black" : "font-medium text-muted"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "font-extrabold tabular-nums text-black"
            : "font-semibold tabular-nums text-ink"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Playground: coupon bill must use coupon_discount_minor when a code is set,
 * not Math.max with an inflated promotion_discount_total_minor.
 */
export function OrderBillCouponFixDemo() {
  const wrongMax = Math.max(3550, 1000);
  const order = mapCustomerOrder({
    id: "ord-bill-test",
    order_number: "ORD-TEST-2450",
    status: "pending",
    placed_at: "2026-11-19T11:14:00.000Z",
    subtotal_minor: 145000,
    subtotal_before_coupon_minor: 245000,
    // Inflated promo total (bug shape seen on live order bills).
    promotion_discount_total_minor: 355000,
    coupon_discount_minor: 100000,
    coupon_code: "TEST",
    delivery_fee_minor: 0,
    total_minor: 145000,
    payment_method: "cod",
    items: [
      {
        product_id: "carrot",
        product_name_snapshot: "carrot",
        quantity: 5,
        sold_by_weight: true,
        line_total_minor: 245000,
        list_price_minor: 50000,
      },
    ],
  });

  if (!order) {
    return <p className="p-4 text-sm text-muted">Could not map sample order.</p>;
  }

  return (
    <div className="space-y-6 bg-paper px-4 py-6">
      <div>
        <p className="text-[13px] font-semibold text-forest">Order bill · coupon fix</p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Live bug: Item ₹2450 with coupon TEST ₹1000, but UI took{" "}
          <code className="text-ink">Math.max(promo, coupon)</code> → −₹
          {wrongMax.toLocaleString("en-IN")} → Total ₹0. Mapper now prefers{" "}
          <code className="text-ink">coupon_discount_minor</code> when a code is
          set.
        </p>
      </div>

      <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-black/[0.06]">
        <h3 className="text-sm font-extrabold text-black">Wrong (old max)</h3>
        <div className="mt-3 space-y-2">
          <Row label="Item total" value={inr(2450)} />
          <Row label="Coupon (TEST)" value={`−${inr(wrongMax)}`} />
          <Row label="Delivery fee" value={inr(0)} />
          <div className="border-t border-dashed border-black/20 pt-2">
            <Row label="Total" value={inr(Math.max(0, 2450 - wrongMax))} strong />
          </div>
        </div>
      </section>

      <section className="rounded-[1.35rem] bg-white p-4 ring-1 ring-leaf/25">
        <h3 className="text-sm font-extrabold text-black">Mapped bill (fixed)</h3>
        <p className="mt-1 text-[12px] text-muted">
          {order.number} · carrot 5kg
        </p>
        <div className="mt-3 space-y-2">
          <Row label="Item total" value={inr(order.subtotal)} />
          {order.promoDiscount > 0 ? (
            <Row
              label={
                order.promoCode ? `Coupon (${order.promoCode})` : "Promo"
              }
              value={`−${inr(order.promoDiscount)}`}
            />
          ) : null}
          <Row label="Delivery fee" value={inr(deliveryCharge(order))} />
          <div className="border-t border-dashed border-black/20 pt-2">
            <Row label="Total" value={inr(billedTotal(order))} strong />
          </div>
        </div>
      </section>
    </div>
  );
}
