'use client';

/**
 * @param {{ label: string, className?: string, placeholder?: boolean }} props
 */
export default function WeightLabel({ label, className = '', placeholder = false }) {
  const text = label?.trim() || (placeholder ? '\u00A0' : '');
  if (!text && !placeholder) return null;

  return (
    <span className={`block text-[11px] leading-none text-gray-500 min-h-[12px] ${className}`}>
      {text}
    </span>
  );
}
