'use client';

import { TimeRegular } from '../icons';

/**
 * @param {{ label: string, className?: string, placeholder?: boolean, showIcon?: boolean }} props
 */
export default function WeightLabel({ label, className = '', placeholder = false, showIcon = false }) {
  const text = label?.trim() || (placeholder ? '\u00A0' : '');
  if (!text && !placeholder) return null;

  const showClock = showIcon && Boolean(label?.trim());

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] leading-none text-gray-500 min-h-[12px] ${className}`}>
      {showClock ? (
        <TimeRegular size={12} color="#9CA3AF" className="h-3 w-3 shrink-0" aria-hidden />
      ) : null}
      {text}
    </span>
  );
}
