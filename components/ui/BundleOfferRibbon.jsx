'use client';

/**
 * Violet BXGY pennant on the product image (left edge).
 * @param {{ label: string, compact?: boolean, offset?: boolean, className?: string }} props
 */
export default function BundleOfferRibbon({
  label,
  compact = false,
  offset = false,
  className = '',
}) {
  const text = String(label || '').trim();
  if (!text) return null;

  return (
    <div
      className={`pointer-events-none absolute left-0 z-30 max-w-[90%] sm:max-w-[85%] ${
        offset ? 'top-8' : 'top-2'
      } ${className}`}
      aria-hidden
    >
      <div
        className={`relative flex items-center bg-gradient-to-r from-violet-600 via-violet-700 to-violet-800 font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_2px_8px_rgba(91,33,182,0.4)] ring-1 ring-white/20 ${
          compact
            ? 'min-h-[20px] py-1 pl-2 pr-3 text-[8px] rounded-r-sm'
            : 'min-h-[24px] py-1.5 pl-2.5 pr-3.5 text-[9px] sm:min-h-[26px] sm:text-[10px] rounded-r-md'
        }`}
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)',
        }}
      >
        <span className="whitespace-nowrap">{text}</span>
      </div>
    </div>
  );
}
