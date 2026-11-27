"use client";

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { rememberProduct } from "@/lib/product-snapshots";
import { showPopup } from "@/components/ui/Toast";
import { enqueueOfflineAction } from "@/lib/offline-action-queue";
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
    const queued = enqueueOfflineAction({
      kind: "wishlist",
      productId: product.id,
      label: product.name,
    });
    if (queued) {
      showPopup(
        wasSaved
          ? `Queued: remove ${product.name}`
          : `Queued: save ${product.name}`,
        "info",
      );
    } else if (wasSaved) {
      showPopup("Removed from wishlist", "info");
    } else {
      showPopup("Saved to wishlist", "success");
    }
  }, [ephemeralIds, meta, product, router, stored]);

  // Keep labels auth-agnostic so SSR (always guest) matches client hydrate
  // after session restore under streaming Suspense. Guest click still → login.
  const ariaLabel = wishlisted
    ? `Remove ${product.name} from wishlist`
    : `Add ${product.name} to wishlist`;

  return { wishlisted, onToggle, ariaLabel };
}
