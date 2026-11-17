"use client";

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { rememberProduct } from "@/lib/product-snapshots";
import { showPopup } from "@/components/ui/Toast";
import type { SampleProduct } from "@/lib/sample-products";
import {
  hasStoredWishlistId,
  subscribeWishlist,
  toggleStoredWishlistId,
  useWishlistMeta,
  useWishlistIds,
} from "@/components/wishlist/WishlistContext";

/**
 * Heart for one product. Storefront cards subscribe to this id only,
 * so saving a different product does not re-render them.
 */
export function useWishlistToggle(product: SampleProduct) {
  const router = useRouter();
  const meta = useWishlistMeta();
  const ephemeralIds = useWishlistIds();
  const stored = useSyncExternalStore(
    subscribeWishlist,
    () => hasStoredWishlistId(product.id),
    () => false,
  );

  const wishlisted = !meta?.signedIn
    ? false
    : meta.ephemeral
      ? ephemeralIds.includes(product.id)
      : stored;

  const onToggle = useCallback(() => {
    if (!meta?.signedIn) {
      showPopup("Sign in to save favourites", "info");
      router.push("/login");
      return;
    }
    const wasSaved = meta.ephemeral ? ephemeralIds.includes(product.id) : stored;
    rememberProduct(product);
    if (meta.ephemeral) meta.toggle(product.id);
    else toggleStoredWishlistId(product.id);
    if (wasSaved) showPopup("Removed from wishlist", "info");
    else showPopup("Saved to wishlist", "success");
  }, [ephemeralIds, meta, product, router, stored]);

  const ariaLabel = !meta?.signedIn
    ? `Sign in to save ${product.name}`
    : wishlisted
      ? `Remove ${product.name} from wishlist`
      : `Add ${product.name} to wishlist`;

  return { wishlisted, onToggle, ariaLabel };
}
