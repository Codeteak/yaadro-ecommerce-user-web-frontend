/**
 * Shared chrome hide/show decisions for BottomNav + ViewCartBar.
 *
 * Near-bottom upward deltas are ignored so rubber-band / clamp at the end
 * of a scroller cannot flip the nav visible again (vibration). Clearance
 * padding itself stays constant on scroll-hide — see StorefrontChrome.
 */

/** Match StorefrontChrome clearance (5.5rem) plus transition slack. */
export const NAV_NEAR_BOTTOM_PX = 120;

export type NavScrollSample = {
  y: number;
  dy: number;
  nearTop: number;
  /** Max scrollTop / scrollY for the scroller (scrollHeight - clientHeight). */
  maxY: number;
};

export type NavScrollAction = "show" | "hide" | "keep";

export function navScrollAction(sample: NavScrollSample): NavScrollAction {
  const { y, dy, nearTop, maxY } = sample;
  const distanceToBottom = Math.max(0, maxY - y);

  if (y <= nearTop) return "show";

  // Real scroll-up: only reveal once the user has left the bottom dead zone.
  // Clamps from clearance collapse keep distanceToBottom ≈ 0 — ignore those.
  if (dy < -4) {
    return distanceToBottom > NAV_NEAR_BOTTOM_PX ? "show" : "keep";
  }

  if (dy > 4) return "hide";
  return "keep";
}
