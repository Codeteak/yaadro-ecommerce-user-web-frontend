import { SAMPLE_PRODUCTS, type SampleProduct } from "@/lib/sample-products";
import { isOfferDhamakaSectionTitle } from "@/lib/offer-dhamaka-title";

export {
  isOfferDhamakaSectionTitle,
  offerDhamakaCountLabel,
  offerDhamakaSeeAllLabel,
} from "@/lib/offer-dhamaka-title";

/**
 * Offer Dhamaka home promo card — playground only for now.
 * Not wired to shop_home_sections (that path is dairy/festive/plain shelves).
 * Buy-X-get-Y / deals will use a dedicated backend section + API later.
 *
 * Art is 682×1024 and already includes “Special Offers” + “Price Drop”.
 * Do not overlay an admin/HTML title header — copy lives in the creative.
 */

export const OFFER_DHAMAKA_BG = "/home/offer-dhamaka.jpg";

export const OFFER_DHAMAKA_ART_W = 682;
export const OFFER_DHAMAKA_ART_H = 1024;

/**
 * Home-card crop height (shorter than full 1024 art).
 * Keeps Special Offers + Price Drop + basket; trims empty purple below so the
 * block doesn’t eat the whole /home viewport. Image uses object-top.
 */
export const OFFER_DHAMAKA_CARD_ART_H = 760;

/** Playground See-all until a dedicated deals API is wired. */
export const OFFER_DHAMAKA_DEFAULT_HREF = "/playground/offer-dhamaka-page";

/** 2-col peek inside the card (same as festive). */
export const OFFER_DHAMAKA_PEEK = 4;

export type OfferDhamakaShelf = {
  id: string;
  title: string;
  products: SampleProduct[];
};

/** Sample price-drop shelf for playground. */
export const SAMPLE_OFFER_DHAMAKA: OfferDhamakaShelf = {
  id: "playground-offer-dhamaka",
  title: "Special offers",
  products: SAMPLE_PRODUCTS.filter((p) =>
    ["Fruits", "Vegetables", "Snacks", "Dairy"].includes(p.category),
  )
    .filter((p) => typeof p.mrp === "number" && p.mrp > p.price)
    .slice(0, 12),
};

export function pickOfferDhamakaShelf(
  shelves: OfferDhamakaShelf[] | undefined | null,
): OfferDhamakaShelf | null {
  if (!shelves?.length) return null;
  const match = shelves.find(
    (shelf) =>
      isOfferDhamakaSectionTitle(shelf.title) && shelf.products.length > 0,
  );
  return match ?? null;
}
