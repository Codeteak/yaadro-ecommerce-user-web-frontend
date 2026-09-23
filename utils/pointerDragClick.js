/**
 * Shared pointer drag vs tap heuristics for horizontal carousels / rails.
 * Mobile finger wobble often exceeds 8px on an intentional tap — keep thresholds soft.
 */

/** Movement before we lock to X or Y axis. */
export const AXIS_LOCK_PX = 10;

/**
 * Horizontal displacement that counts as a real drag (suppresses the following click).
 * ~24px matches typical touch slop on phones.
 */
export const DRAG_CLICK_PX = 24;

/**
 * @param {number} adx absolute delta X from pointer start
 * @param {number} ady absolute delta Y from pointer start
 * @param {number} [lockPx]
 * @returns {'x'|'y'|null}
 */
export function resolvePointerAxis(adx, ady, lockPx = AXIS_LOCK_PX) {
  if (adx < lockPx && ady < lockPx) return null;
  return adx >= ady ? 'x' : 'y';
}

/**
 * Whether this pointer move has crossed the drag threshold.
 * @param {number} deltaX signed or absolute displacement from start
 * @param {number} [thresholdPx]
 */
export function shouldMarkAsDrag(deltaX, thresholdPx = DRAG_CLICK_PX) {
  return Math.abs(deltaX) > thresholdPx;
}

/**
 * Decide if the synthetic click after pointerup should be blocked.
 * Clears "false drag" when the finger mostly returned to the start (wobble).
 *
 * @param {{ didDrag: boolean, totalDeltaX: number, thresholdPx?: number }} args
 */
export function shouldSuppressClickAfterDrag({
  didDrag,
  totalDeltaX,
  thresholdPx = DRAG_CLICK_PX,
}) {
  if (!didDrag) return false;
  return Math.abs(totalDeltaX) > thresholdPx;
}
