/** Light tap feedback on supported mobile browsers. No-op elsewhere. */

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function tapFeedback() {
  if (!canVibrate() || prefersReducedMotion()) return;
  navigator.vibrate(10);
}

export function successFeedback() {
  if (!canVibrate() || prefersReducedMotion()) return;
  navigator.vibrate([12, 40, 12]);
}

export function errorFeedback() {
  if (!canVibrate() || prefersReducedMotion()) return;
  navigator.vibrate([20, 60, 20, 60, 20]);
}
