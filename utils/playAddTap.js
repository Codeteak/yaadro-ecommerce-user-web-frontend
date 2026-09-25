import { tapFeedback } from './haptics.js';

/** Haptic plus a short press animation on the ADD control. */
export function playAddTap(el) {
  tapFeedback();
  if (!el?.classList) return;
  el.classList.remove('yaadro-add-tap');
  void el.offsetWidth;
  el.classList.add('yaadro-add-tap');
}
