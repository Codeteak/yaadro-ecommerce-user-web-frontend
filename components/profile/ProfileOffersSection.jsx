'use client';

import { Tag, Loader2 } from 'lucide-react';
import { useStorefrontCoupons } from '../../hooks/useCoupons';
import {
  formatCouponBenefitLabel,
  formatCouponMinCartHint,
} from '../../utils/storefrontCouponsApi';

function isCategoryOfferCoupon(coupon) {
  return (coupon?.benefits || []).some((b) => b?.kind === 'category_percent_off');
}

function OfferCard({ coupon }) {
  const benefit =
    coupon.benefits?.length > 0 ? formatCouponBenefitLabel(coupon.benefits[0]) : 'Category offer';
  const title = coupon.promotionName || benefit;
  const minHint = formatCouponMinCartHint(coupon, 0);

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Tag className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-900 line-clamp-2">{title}</p>
          <p className="mt-0.5 text-[12px] text-violet-800/90">{benefit}</p>
          {minHint && <p className="mt-1 text-[11px] font-medium text-amber-700">{minHint}</p>}
        </div>
      </div>
    </div>
  );
}

export default function ProfileOffersSection() {
  const { data, isLoading, isError } = useStorefrontCoupons(0, { enabled: true });

  const categoryOffers = (data?.coupons || []).filter(isCategoryOfferCoupon);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || categoryOffers.length === 0) {
    return (
      <p className="py-2 text-center text-[13px] text-gray-500">
        No category offers right now. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {categoryOffers.map((coupon) => (
        <OfferCard key={coupon.id || coupon.code} coupon={coupon} />
      ))}
    </div>
  );
}
