import { SAMPLE_PRODUCTS, type SampleProduct } from "@/lib/sample-products";
import { isOfferDhamakaSectionTitle } from "@/lib/offer-dhamaka-title";

export {
  isOfferDhamakaSectionTitle,
  offerDhamakaCountLabel,
  offerDhamakaSeeAllLabel,
} from "@/lib/offer-dhamaka-title";

/**
 * Offer Dhamaka home promo card.
 * Live /home + /deals pick a shop home-section by title keywords
 * (dhamaka / price drop / special offers); playground uses SAMPLE_OFFER_DHAMAKA.
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

/** See-all page for the home Offer Dhamaka card. */
export const OFFER_DHAMAKA_DEFAULT_HREF = "/deals";

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
