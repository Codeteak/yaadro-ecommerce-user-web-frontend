import {
  getSampleProduct,
  type SampleProduct,
} from "@/lib/sample-products";

/**
 * Sample home shelves until catalog rankings / wishlist API land.
 * Stable id lists — no random shuffle (avoids hydration flicker).
 */

export type HomeShelfId = "featured" | "most-ordered" | "favourites";

export type HomeShelfDef = {
  id: HomeShelfId;
  title: string;
  subtitle: string;
  productIds: readonly string[];
};

export const HOME_SHELVES: readonly HomeShelfDef[] = [
  {
    id: "featured",
    title: "Featured products",
    subtitle: "Picks we think you’ll like",
    productIds: ["fr-1", "vg-2", "bk-1", "de-1", "bv-1", "sn-1"],
  },
  {
    id: "most-ordered",
    title: "Most ordered",
    subtitle: "Popular with Yaadro shoppers",
    productIds: ["vg-1", "fr-2", "sn-3", "bv-2", "de-2", "vg-4", "fr-4", "bk-2"],
  },
  {
    id: "favourites",
    title: "Your favourites",
    subtitle: "Sample favourites — real list when wishlist syncs",
    productIds: ["fr-3", "vg-3", "sn-2", "bv-3", "de-3", "bk-3"],
  },
] as const;

export function productsForShelf(shelf: HomeShelfDef): SampleProduct[] {
  return shelf.productIds
    .map((id) => getSampleProduct(id))
    .filter((p): p is SampleProduct => Boolean(p));
}
