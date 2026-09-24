/** Shared Hero UI / CTA class overrides for brand purple (#902bf5). */
export const BRAND_PRIMARY_BTN =
  'bg-[#902bf5] text-white hover:bg-[#7d24d6] shadow-[0_8px_24px_rgba(144,43,245,0.35)] touch-manipulation transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.98] active:bg-[#7d24d6] motion-reduce:transition-none motion-reduce:active:scale-100';

export const BRAND_PRIMARY_BTN_FULL = `h-[52px] w-full rounded-full text-[15px] font-semibold ${BRAND_PRIMARY_BTN}`;

export const BRAND_CHECKOUT_BTN =
  'rounded-full bg-[#902bf5] text-white hover:bg-[#7d24d6] font-medium touch-manipulation transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] active:bg-[#7d24d6] motion-reduce:transition-none motion-reduce:active:scale-100';

/**
 * Icon / header controls (Back, search, close).
 * CSS-only 150ms press — no JS state, no artificial delay.
 */
export const PRESSABLE_ICON_BTN =
  'touch-manipulation transition-[transform,background-color,opacity,box-shadow] duration-150 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 motion-reduce:transition-none motion-reduce:active:scale-100';

/** Soft grey wash on press — for round/square icon buttons on white headers. */
export const PRESSABLE_ICON_BTN_SOFT = `${PRESSABLE_ICON_BTN} active:bg-gray-100`;

/** Text / outline CTAs. */
export const PRESSABLE_BTN =
  'touch-manipulation transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.98] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 motion-reduce:transition-none motion-reduce:active:scale-100';
