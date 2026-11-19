/**
 * Phase D #33 — copy for price-may-vary explain + Help FAQ deep-link.
 */

export const PRICE_MAY_VARY_TOPIC = "price" as const;

export const PRICE_MAY_VARY_EXPLAIN = {
  title: "Why prices may change",
  intro:
    "The amount you see in the cart is an estimate. The final bill can differ slightly for either reason below.",
  reasons: [
    {
      id: "shop-price",
      title: "Shop price updated",
      body: "The store may update the selling price after you add an item. Checkout and packing use the latest shop price.",
    },
    {
      id: "weight",
      title: "Custom or variable weight",
      body: "Items sold by weight (for example produce) are billed by the final packed weight, which can differ from the cart estimate.",
    },
  ],
  helpLabel: "Open Help & Support",
  helpQuestion: "Why might the price change?",
} as const;
