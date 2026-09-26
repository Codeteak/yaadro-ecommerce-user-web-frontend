import { tapFeedback } from './haptics.js';

/** How long the ADD press animation runs (keep in sync with globals.css). */
export const ADD_TAP_MS = 150;

/**
 * Hold the ADD button UI this long after tap so the press anim can finish
 * before flipping to spinner / qty stepper.
 */
export const ADD_TAP_UI_HOLD_MS = 150;

export function waitAddTapHold(ms = ADD_TAP_UI_HOLD_MS) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Haptic plus a short press animation on the ADD control.
 * Call with the button element (ref or event.currentTarget).
 * Returns a promise that resolves when the animation should have painted.
 */
export function playAddTap(el) {
  tapFeedback();
  if (!el?.classList) return Promise.resolve();

  el.classList.remove('yaadro-add-tap');
  // Force reflow so re-adding the class restarts the animation on rapid taps.
  void el.offsetWidth;
  el.classList.add('yaadro-add-tap');

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.classList.remove('yaadro-add-tap');
      resolve();
    };

    const onEnd = (event) => {
      if (event.target !== el) return;
      if (event.animationName && event.animationName !== 'yaadro-add-tap') return;
      el.removeEventListener('animationend', onEnd);
      clearTimeout(fallback);
      finish();
    };

    el.addEventListener('animationend', onEnd);
    const fallback = setTimeout(() => {
      el.removeEventListener('animationend', onEnd);
      finish();
    }, ADD_TAP_MS + 40);
  });
}

/** Press anim + hold before callers should update cart UI. */
export async function playAddTapAndHold(el, holdMs = ADD_TAP_UI_HOLD_MS) {
  const tap = playAddTap(el);
  await waitAddTapHold(holdMs);
  void tap;
}
