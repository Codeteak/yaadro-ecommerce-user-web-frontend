import assert from "node:assert/strict";
import test from "node:test";
import {
  mapCustomerOrder,
  mapDeliveryPartner,
  pickDeliveryTrackingUrl,
} from "./map-customer-order.ts";
import { billedTotal, deliveryCharge } from "../orders-bill.ts";

test("maps order so bill rows add up: item total − promo + shipping = total", () => {
  const order = mapCustomerOrder({
    id: "ord-1",
    order_number: "YAD-1",
    status: "pending",
    placed_at: "2026-11-19T10:00:00.000Z",
    // Shop stores payable items (already net of ₹50 promo).
    subtotal_minor: 45000,
    promotion_discount_total_minor: 5000,
    coupon_discount_minor: 5000,
    coupon_code: "FRESH50",
    delivery_fee_minor: 2500,
    total_minor: 47500,
    payment_method: "cod",
    items: [
      {
        product_id: "p1",
        product_name_snapshot: "Milk",
        quantity: 2,
        line_total_minor: 45000,
        list_price_minor: 25000,
      },
    ],
  });
  assert.ok(order);
  assert.equal(order.subtotal, 500); // before promo
  assert.equal(order.promoDiscount, 50);
  assert.equal(order.deliveryFee, 25);
  assert.equal(order.totalDue, 475);
  assert.equal(deliveryCharge(order), 25);
  assert.equal(billedTotal(order), 475);
  assert.equal(order.subtotal - order.promoDiscount + 25, billedTotal(order));
});

test("does not double-subtract promo when API total already includes delivery", () => {
  const order = mapCustomerOrder({
    id: "ord-2",
    order_number: "YAD-2",
    status: "pending",
    subtotal_minor: 45000,
    promotion_discount_total_minor: 5000,
    delivery_fee_minor: 2500,
    total_minor: 47500,
    items: [],
  });
  assert.ok(order);
  assert.equal(billedTotal(order), 475);
  assert.notEqual(billedTotal(order), 425);
});

test("uses subtotal_before_coupon_minor when present", () => {
  const order = mapCustomerOrder({
    id: "ord-3",
    order_number: "YAD-3",
    status: "pending",
    subtotal_minor: 40000,
    subtotal_before_coupon_minor: 45000,
    promotion_discount_total_minor: 5000,
    delivery_fee_minor: 0,
    total_minor: 40000,
    items: [],
  });
  assert.ok(order);
  assert.equal(order.subtotal, 450);
  assert.equal(billedTotal(order), 400);
});

test("maps delivery partner when the API sends one", () => {
  const rider = mapDeliveryPartner({
    delivery_partner: { name: "Suresh K", phone: "+91 98765 00000" },
  });
  assert.deepEqual(rider, {
    name: "Suresh K",
    initial: "S",
    phone: "+91 98765 00000",
  });

  const order = mapCustomerOrder({
    id: "ord-4",
    order_number: "YAD-4",
    status: "out_for_delivery",
    subtotal_minor: 10000,
    delivery_fee_minor: 0,
    total_minor: 10000,
    rider_name: "Meena R",
    rider_phone: "9999911111",
    items: [],
  });
  assert.ok(order?.rider);
  assert.equal(order.rider.name, "Meena R");
  assert.equal(order.rider.phone, "9999911111");
});

test("does not invent a delivery partner when the API omits one", () => {
  assert.equal(mapDeliveryPartner({}), undefined);
  const order = mapCustomerOrder({
    id: "ord-5",
    order_number: "YAD-5",
    status: "delivered",
    subtotal_minor: 10000,
    delivery_fee_minor: 0,
    total_minor: 10000,
    items: [],
  });
  assert.ok(order);
  assert.equal(order.rider, undefined);
});

test("maps deliveryTrackingUrl from camelCase or snake_case http(s) URLs", () => {
  assert.equal(
    pickDeliveryTrackingUrl({
      deliveryTrackingUrl: " https://track.example/abc ",
    }),
    "https://track.example/abc",
  );
  assert.equal(
    pickDeliveryTrackingUrl({
      delivery_tracking_url: "http://partner.test/ride/1",
    }),
    "http://partner.test/ride/1",
  );
  assert.equal(
    pickDeliveryTrackingUrl({
      deliveryTrackingUrl: "https://first.example/a",
      delivery_tracking_url: "https://second.example/b",
    }),
    "https://first.example/a",
  );

  const camel = mapCustomerOrder({
    id: "ord-track-1",
    order_number: "YAD-T1",
    status: "out_for_delivery",
    subtotal_minor: 10000,
    delivery_fee_minor: 0,
    total_minor: 10000,
    deliveryTrackingUrl: "https://dms.example/t/1",
    delivery_partner_name: "Ravi",
    delivery_partner_phone: "9876543210",
    items: [],
  });
  assert.ok(camel);
  assert.equal(camel.deliveryTrackingUrl, "https://dms.example/t/1");
  assert.equal(camel.rider?.name, "Ravi");

  const snake = mapCustomerOrder({
    id: "ord-track-2",
    order_number: "YAD-T2",
    status: "shipped",
    subtotal_minor: 10000,
    delivery_fee_minor: 0,
    total_minor: 10000,
    delivery_tracking_url: "https://dms.example/t/2",
    items: [],
  });
  assert.ok(snake);
  assert.equal(snake.deliveryTrackingUrl, "https://dms.example/t/2");
});

test("drops empty or non-http delivery tracking URLs", () => {
  assert.equal(pickDeliveryTrackingUrl({ deliveryTrackingUrl: "   " }), undefined);
  assert.equal(
    pickDeliveryTrackingUrl({ delivery_tracking_url: "javascript:alert(1)" }),
    undefined,
  );
  assert.equal(
    pickDeliveryTrackingUrl({ deliveryTrackingUrl: "/relative/path" }),
    undefined,
  );
  const order = mapCustomerOrder({
    id: "ord-track-bad",
    order_number: "YAD-TB",
    status: "pending",
    subtotal_minor: 10000,
    delivery_fee_minor: 0,
    total_minor: 10000,
    delivery_tracking_url: "not-a-url",
    items: [],
  });
  assert.ok(order);
  assert.equal(order.deliveryTrackingUrl, undefined);
});

test("coupon code uses coupon_discount_minor — ignores inflated promotion total", () => {
  // Regression: Item ₹2450, TEST −₹1000 → Total ₹1450 (not −₹3550 → ₹0).
  const order = mapCustomerOrder({
    id: "ord-bill-test",
    order_number: "ORD-TEST-2450",
    status: "pending",
    subtotal_minor: 145000,
    subtotal_before_coupon_minor: 245000,
    promotion_discount_total_minor: 355000,
    coupon_discount_minor: 100000,
    coupon_code: "TEST",
    delivery_fee_minor: 0,
    total_minor: 145000,
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
  assert.ok(order);
  assert.equal(order.subtotal, 2450);
  assert.equal(order.promoCode, "TEST");
  assert.equal(order.promoDiscount, 1000);
  assert.equal(order.totalDue, 1450);
  assert.equal(billedTotal(order), 1450);
  assert.equal(order.subtotal - order.promoDiscount, billedTotal(order));
});
