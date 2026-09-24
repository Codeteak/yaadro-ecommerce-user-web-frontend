'use client';

import { PRESSABLE_ICON_BTN_SOFT } from './brandButton';

/**
 * Shared header Back control — immediate CSS press feedback.
 * Navigation stays in the parent (do not change route logic here).
 */
export default function IconBackButton({
  onClick,
  className = '',
  ariaLabel = 'Back',
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-800 ${PRESSABLE_ICON_BTN_SOFT} ${className}`.trim()}
    >
      {children ?? (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      )}
    </button>
  );
}
