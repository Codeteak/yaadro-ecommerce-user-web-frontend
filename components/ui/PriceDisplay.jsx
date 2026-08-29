'use client';

import { formatRupeeINR } from '../../utils/productUtils';

const SIZE_CLASS = {
  sm: {
    amount: 'text-sm font-bold',
    symbol: 'text-[0.82em] font-semibold',
    mrp: 'text-[10px]',
  },
  md: {
    amount: 'text-base font-bold sm:text-lg',
    symbol: 'text-[0.85em] font-semibold',
    mrp: 'text-xs',
  },
  lg: {
    amount: 'text-2xl font-bold sm:text-3xl',
    symbol: 'text-[0.85em] font-semibold',
    mrp: 'text-sm',
  },
};

/**
 * @param {{ amount: number, listPrice?: number|null, size?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function PriceDisplay({
  amount,
  listPrice = null,
  size = 'md',
  className = '',
}) {
  const sizes = SIZE_CLASS[size] ?? SIZE_CLASS.md;
  const showMrp =
    listPrice != null && Number.isFinite(Number(listPrice)) && Number(listPrice) > Number(amount) + 1e-9;

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums text-gray-900 ${className}`}>
      <span className={`inline-flex items-baseline gap-0.5 ${sizes.amount}`}>
        <span className={`leading-none ${sizes.symbol}`}>₹</span>
        <span>{formatRupeeINR(amount)}</span>
      </span>
      {showMrp && (
        <span className={`inline-flex items-baseline gap-0.5 font-medium text-gray-400 line-through ${sizes.mrp}`}>
          <span className="text-[0.9em]">₹</span>
          <span>{formatRupeeINR(listPrice)}</span>
        </span>
      )}
    </span>
  );
}
