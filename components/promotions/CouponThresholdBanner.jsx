'use client';

/**
 * Compact “₹X more to unlock coupon” banner for cart / checkout.
 */
export default function CouponThresholdBanner({ hint }) {
  if (!hint?.message) return null;
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F4F5F7] px-3.5 py-2.5">
      <p className="text-[12px] font-medium text-gray-800">{hint.message}</p>
      {hint.code ? (
        <p className="mt-0.5 text-[11px] text-violet-700">Coupon {hint.code}</p>
      ) : null}
    </div>
  );
}
