/**
 * Decide how a wheel event over a horizontal product rail should be handled.
 *
 * Vertical pans must go to the page — `overflow-x:auto` + `overflow-y:hidden`
 * scrollports otherwise trap the wheel when the pointer is over cards.
 *
 * @param {{ deltaX: number, deltaY: number, shiftKey: boolean, canScrollHoriz: boolean }} args
 * @returns {'page'|'native-h'|'rail-shift'|'ignore'}
 */
export function resolveRailWheelIntent({ deltaX, deltaY, shiftKey, canScrollHoriz }) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absY >= absX && !shiftKey) {
    return absY ? 'page' : 'ignore';
  }
  if (!canScrollHoriz) return 'ignore';
  if (absX > absY) return 'native-h';
  if (shiftKey && absY > 0) return 'rail-shift';
  return 'ignore';
}
