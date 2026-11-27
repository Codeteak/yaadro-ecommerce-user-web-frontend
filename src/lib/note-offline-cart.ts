import { showPopup } from "@/components/ui/Toast";
import { enqueueOfflineAction } from "@/lib/offline-action-queue";

/**
 * After a local basket write: if offline, log intent + toast “Queued…”.
 * Returns true when queued (caller can skip other toasts).
 */
export function noteOfflineCartChange(productId: string, productName: string) {
  const queued = enqueueOfflineAction({
    kind: "cart",
    productId,
    label: productName,
  });
  if (queued) {
    showPopup(`Queued: update ${productName}`, "info");
  }
  return queued;
}
