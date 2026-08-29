'use client';

import { Loading2Regular as Loader2, TagRegular as Tag } from '../icons';
import { useStorefrontCoupons } from '../../hooks/useCoupons';
import {
  formatCouponBenefitLabel,
  formatCouponMinCartHint,
} from '../../utils/storefrontCouponsApi';
import { formatCouponIneligibilityHint } from '../../utils/cartPromotions';

function CouponCard({ coupon }) {
  const applicable = coupon.eligibility?.applicable !== false;
  const benefit =
    coupon.benefits?.length > 0 ? formatCouponBenefitLabel(coupon.benefits[0]) : 'Special offer';
  const minHint = formatCouponMinCartHint(coupon, 0);
  const ineligibleHint = !applicable
    ? formatCouponIneligibilityHint(coupon.eligibility?.ineligibilityCodes)
    : null;
  const title = coupon.promotionName || benefit;

  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        applicable
          ? 'border-gray-100 bg-white'
          : 'border-gray-100 bg-gray-50/90 opacity-90'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
            applicable ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Tag size={16} className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-md bg-gray-900 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white">
            {coupon.code}
          </span>
          <p className="mt-1 text-[13px] font-medium text-gray-900 line-clamp-2">{title}</p>
          <p className="text-[12px] text-gray-500">{benefit}</p>
          {minHint && <p className="mt-1 text-[11px] font-medium text-amber-700">{minHint}</p>}
          {ineligibleHint && !minHint && (
            <p className="mt-1 text-[11px] font-medium text-amber-700">{ineligibleHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileCouponsSection() {
  const { data, isLoading, isError } = useStorefrontCoupons(0, { enabled: true });

  const coupons = data?.coupons || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 size={20} className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || coupons.length === 0) {
    return (
      <p className="py-2 text-center text-[13px] text-gray-500">
        No coupons available at the moment.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {coupons.map((coupon) => (
        <CouponCard key={coupon.id || coupon.code} coupon={coupon} />
      ))}
    </div>
  );
}
