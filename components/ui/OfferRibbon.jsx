'use client';

import { formatRupeeINR } from '../../utils/productUtils';

/**
 * Horizontal save ribbon on product image (left edge).
 * @param {{ saveRupees: number, compact?: boolean, className?: string }} props
 */
export default function OfferRibbon({ saveRupees, compact = false, className = '' }) {
  if (saveRupees == null || saveRupees < 0.005) return null;

  return (
    <div
      className={`pointer-events-none absolute left-0 top-2 z-30 max-w-[85%] sm:max-w-[80%] ${className}`}
      aria-hidden
    >
      <div
        className={`relative flex items-center bg-gradient-to-r from-red-600 via-red-700 to-red-800 font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_2px_8px_rgba(153,27,27,0.45)] ring-1 ring-white/20 ${
          compact
            ? 'min-h-[20px] py-1 pl-2 pr-3 text-[8px] rounded-r-sm'
            : 'min-h-[24px] py-1.5 pl-2.5 pr-3.5 text-[9px] sm:min-h-[26px] sm:text-[10px] rounded-r-md'
        }`}
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)',
        }}
      >
        <span className="whitespace-nowrap tabular-nums">Save ₹{formatRupeeINR(saveRupees)}</span>
      </div>
    </div>
  );
}
